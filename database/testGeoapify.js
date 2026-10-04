require("dotenv").config();
const db = require("./connect");

async function testGeoapify() {
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY;

    if (!apiKey) {
      throw new Error("GEOAPIFY_API_KEY is missing");
    }

    // Choose one hexagon and get its centre coordinates.
    const { rows } = await db.query(`
        SELECT
            h3_index::text AS h3_index,
            h3_cell_to_lat_lng(h3_index) AS coords
        FROM map_area_references
        ORDER BY area_number
        LIMIT 1;
        `);

    if (rows.length === 0) {
      throw new Error("No hexagons found in map_area_references");
    }

    const { h3_index, coords } = rows[0];

    const url = new URL("https://api.geoapify.com/v1/geocode/reverse");

    url.search = new URLSearchParams({
      lat: String(coords.y),
      lon: String(coords.x),
      type: "street",
      format: "json",
      lang: "en",
      apiKey,
    }).toString();

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Geoapify returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const location = data.results?.[0];

    if (!location) {
      console.log("No location returned for hexagon:", h3_index);
      return;
    }

    const streetName = location.street?.trim();

    if (streetName) {
      await db.query(
        `
            UPDATE map_area_references
            SET street_name = $1
            WHERE h3_index = $2::h3index;
            `,
        [streetName, h3_index],
      );

      console.log("Street name saved:", streetName);
    } else {
      console.log("No street name returned; nothing saved.");
    }

    console.log({
      h3: h3_index,
      street: location.street || null,
      suburb: location.suburb || null,
      city: location.city || null,
      county: location.county || null,
      formatted: location.formatted || null,
      distanceMetres: location.distance ?? null,
    });
  } catch (error) {
    console.error("Geoapify test failed", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

testGeoapify();

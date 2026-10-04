require("dotenv").config();
const db = require("./connect");

const BATCH_SIZE = 2500;
const DAILY_REQUEST_LIMIT = 2500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function populateStreetNames() {
  let completed = 0;

  try {
    const apiKey = process.env.GEOAPIFY_API_KEY;

    if (!apiKey) {
      throw new Error("GEOAPIFY_API_KEY is missing");
    }

    const { rows } = await db.query(
      `
        SELECT
            h3_index::text AS h3_index,
            h3_cell_to_lat_lng(h3_index) AS coords
        FROM map_area_references
        WHERE street_lookup_at IS NULL
        ORDER BY area_number
        LIMIT $1;
        `,
      [BATCH_SIZE],
    );

    console.log(`Processing ${rows.length} hexagons.`);

    for (const row of rows) {
      const latitude = Number(row.coords?.y);
      const longitude = Number(row.coords?.x);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error(`Invalid coordinates for ${row.h3_index}`);
      }

      const url = new URL("https://api.geoapify.com/v1/geocode/reverse");

      url.search = new URLSearchParams({
        lat: String(latitude),
        lon: String(longitude),
        type: "street",
        format: "json",
        lang: "en",
        apiKey,
      }).toString();

      const reservation = await reserveGeoapifyRequest();

      if (!reservation) {
        console.log(
          `Daily limit of ${DAILY_REQUEST_LIMIT} requests reached. ` +
            "Run the script again tomorrow.",
        );
        break;
      }

      console.log(
        `Daily requests reserved: ${reservation.request_count}` +
          `/${DAILY_REQUEST_LIMIT}`,
      );

      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorBody = await response.text();

        console.error("Failed hexagon:", row.h3_index);
        console.error("Coordinates:", { latitude, longitude });
        console.error("Geoapify response:", errorBody);
        throw new Error(
          `Geoapify returned HTTP ${response.status}; stopping batch`,
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.results)) {
        throw new Error("Unexpected Geoapify response; stopping back");
      }

      const streetName = data.results[0]?.street?.trim() || null;

      await db.query(
        `
            UPDATE map_area_references
            SET street_name = $1,
                street_lookup_at = NOW()
            WHERE h3_index = $2::h3index;
        `,
        [streetName, row.h3_index],
      );

      completed += 1;

      console.log(
        `${completed}/${rows.length}: ${row.h3_index} → ${
          streetName || "No street found"
        }`,
      );

      await sleep(1100);
    }

    console.log(`Finished. Saved ${completed} lookups.`);
  } catch (error) {
    console.error("Batch stopped:", error.message);
    console.log(`Saved ${completed} lookups before stopping.`);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

async function reserveGeoapifyRequest() {
  const { rows } = await db.query(
    `
    INSERT INTO geoapify_daily_usage AS usage (
    usage_date, 
    request_count
  )
  VALUES (
    (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
    1
  )
    ON CONFLICT (usage_date)
    DO UPDATE
    SET request_count = usage.request_count + 1
    WHERE usage.request_count < $1
    RETURNING usage_date, request_count;
    `,
    [DAILY_REQUEST_LIMIT],
  );

  return rows[0] || null;
}

populateStreetNames();

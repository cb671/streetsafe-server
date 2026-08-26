const db = require("../database/connect");

class Crime {
  static getFirstAddressValue(address, fields) {
    for (const field of fields) {
      if (address[field]) return address[field];
    }
    return null;
  }

  static async getCrimeDataByH3(startDate, endDate = null) {
    try {
      const query = `
        SELECT
          h3_low_res,
          SUM(burglary) AS burglary,
          SUM(personal_theft) AS personal_theft,
          SUM(weapon_crime) AS weapon_crime,
          SUM(bicycle_theft) AS bicycle_theft,
          SUM(damage) AS damage,
          SUM(robbery) AS robbery,
          SUM(shoplifting) AS shoplifting,
          SUM(violent) AS violent,
          SUM(anti_social) AS anti_social,
          SUM(drugs) AS drugs,
          SUM(vehicle_crime) AS vehicle_crime
        FROM (
          SELECT *, h3_cell_to_parent(h3::h3index, 9) AS h3_low_res
          FROM crime_areas
        ) sub
        WHERE date >= $1 AND date <= $2
        GROUP BY h3_low_res;
      `;
      const values = [startDate.toUTCString(), endDate.toUTCString()];
      const { rows } = await db.query(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getCrimeDataBySpecificH3(h3Index, startDate, endDate) {
    try {
      console.log("getCrimeDataBySpecificH3 called with:", {
        h3Index,
        startDate,
        endDate,
      });

      const endDateValue = endDate || new Date();

      //check if h3Index is a hex string  or a BIGINT
      const isHexString = /[a-fA-F]/.test(h3Index.toString());
      let query;

      if (isHexString) {
        query = `
          SELECT
            h3_low_res,
            SUM(burglary) AS burglary,
            SUM(personal_theft) AS personal_theft,
            SUM(weapon_crime) AS weapon_crime,
            SUM(bicycle_theft) AS bicycle_theft,
            SUM(damage) AS damage,
            SUM(robbery) AS robbery,
            SUM(shoplifting) AS shoplifting,
            SUM(violent) AS violent,
            SUM(anti_social) AS anti_social,
            SUM(drugs) AS drugs,
            SUM(vehicle_crime) AS vehicle_crime
          FROM (
            SELECT *, h3_cell_to_parent(h3::h3index, 9) AS h3_low_res
            FROM crime_areas
          ) sub
          WHERE h3_low_res = $1::h3index AND date >= $2 AND date <= $3
          GROUP BY h3_low_res;
        `;
      } else {
        //BIGINT format
        query = `
          SELECT
            h3_low_res,
            SUM(burglary) AS burglary,
            SUM(personal_theft) AS personal_theft,
            SUM(weapon_crime) AS weapon_crime,
            SUM(bicycle_theft) AS bicycle_theft,
            SUM(damage) AS damage,
            SUM(robbery) AS robbery,
            SUM(shoplifting) AS shoplifting,
            SUM(violent) AS violent,
            SUM(anti_social) AS anti_social,
            SUM(drugs) AS drugs,
            SUM(vehicle_crime) AS vehicle_crime
          FROM (
            SELECT *, h3_cell_to_parent(h3::h3index, 9) AS h3_low_res
            FROM crime_areas
          ) sub
          WHERE h3_low_res = $1::h3index AND date >= $2 AND date <= $3
          GROUP BY h3_low_res;
        `;
      }

      console.log("Query:", query);
      console.log("Values:", [
        h3Index,
        startDate.toUTCString(),
        endDateValue.toUTCString(),
      ]);

      const values = [
        h3Index,
        startDate.toUTCString(),
        endDateValue.toUTCString(),
      ];
      const { rows } = await db.query(query, values);

      console.log("Query result rows:", rows);
      console.log("Returning:", rows[0] || null);

      return rows[0] || null;
    } catch (error) {
      console.error("getCrimeDataBySpecificH3 error:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getLocationDetailsFromH3(h3Index) {
    try {
      let query;
      let queryParams;

      const isHexString = /[a-fA-F]/.test(h3Index.toString());

      if (isHexString) {
        query = `SELECT h3_cell_to_lat_lng($1::h3index) as coords`;
        queryParams = [h3Index];
      } else {
        query = `SELECT h3_cell_to_lat_lng($1::bigint::h3index) as coords`;
        queryParams = [h3Index];
      }

      const { rows } = await db.query(query, queryParams);

      if (rows.length === 0) {
        return {
          name: "Unknown Location",
          displayName: `Unknown Location · ${h3Index}`,
          coordinates: null,
        };
      }

      const lat = rows[0].coords.y;
      const lng = rows[0].coords.x;

      if (
        lat === null ||
        lat === undefined ||
        lng === null ||
        lng === undefined ||
        !Number.isFinite(Number(lat)) ||
        !Number.isFinite(Number(lng))
      ) {
        console.error("Invalid coordinates:", { lat, lng });
        return {
          name: "Unknown Location",
          displayName: `Unknown Location · ${h3Index}`,
          coordinates: null,
        };
      }

      const coordinates = { latitude: lat, longitude: lng };

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=15&addressdetails=1`,
        {
          headers: {
            "User-Agent": "StreetSafe-App/1.0",
          },
        },
      );

      if (!response.ok) {
        return {
          name: "Unknown Location",
          displayName: `Unknown Location · ${h3Index}`,
          coordinates,
        };
      }

      const data = await response.json();
      const address = data.address || {};

      const locationParts = [
        this.getFirstAddressValue(address, [
          "neighbourhood",
          "suburb",
          "hamlet",
          "locality",
          "quarter",
        ]),
        this.getFirstAddressValue(address, [
          "city",
          "town",
          "village",
          "municipality",
          "city_district",
          "county_district",
        ]),
        this.getFirstAddressValue(address, [
          "county",
          "state_district",
          "state",
        ]),
      ].filter(Boolean);

      const uniqueLocationParts = locationParts.filter(
        (part, index, array) => array.indexOf(part) === index,
      );

      const name =
        uniqueLocationParts.length > 0
          ? uniqueLocationParts.join(", ")
          : "Unknown Location";

      return {
        name,
        displayName: `${name} · ${h3Index}`,
        coordinates,
      };
    } catch (error) {
      console.error("Error getting location name:", error);
      return {
        name: "Unknown Location",
        displayName: `Unknown Location · ${h3Index}`,
        coordinates: null,
      };
    }
  }

  static async getLocationNameFromH3(h3Index) {
    const { name } = await this.getLocationDetailsFromH3(h3Index);
    return name;
  }

  static formatCrimeData(rawData) {
    return rawData.map((row) => [
      row.h3_low_res,
      parseInt(row.burglary) || 0,
      parseInt(row.personal_theft) || 0,
      parseInt(row.weapon_crime) || 0,
      parseInt(row.bicycle_theft) || 0,
      parseInt(row.damage) || 0,
      parseInt(row.robbery) || 0,
      parseInt(row.shoplifting) || 0,
      parseInt(row.violent) || 0,
      parseInt(row.anti_social) || 0,
      parseInt(row.drugs) || 0,
      parseInt(row.vehicle_crime) || 0,
    ]);
  }

  static async formatCrimeDataWithLocation(rawData) {
    const formattedData = await Promise.all(
      rawData.map(async (row) => {
        const location = await this.getLocationDetailsFromH3(row.h3_low_res);
        return {
          h3: row.h3_low_res,
          name: location.name,
          displayName: location.displayName,
          coordinates: location.coordinates,
          crimes: [
            parseInt(row.burglary) || 0,
            parseInt(row.personal_theft) || 0,
            parseInt(row.weapon_crime) || 0,
            parseInt(row.bicycle_theft) || 0,
            parseInt(row.damage) || 0,
            parseInt(row.robbery) || 0,
            parseInt(row.shoplifting) || 0,
            parseInt(row.violent) || 0,
            parseInt(row.anti_social) || 0,
            parseInt(row.drugs) || 0,
            parseInt(row.vehicle_crime) || 0,
          ],
        };
      }),
    );
    return formattedData;
  }
}

module.exports = Crime;

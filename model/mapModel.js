const db = require("../database/connect");

class Crime {
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
      const endDateValue = endDate || new Date();

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
        WHERE h3_low_res = $1 AND date >= $2 AND date <= $3
        GROUP BY h3_low_res;
      `;
      const values = [h3Index, startDate.toUTCString(), endDate.toUTCString()];
      const { rows } = await db.query(query, values);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async getLocationNameFromH3(h3Index) {
    try {
      const query = `SELECT h3_cell_to_lat_lng($1::h3index) as coords`;
      const { rows } = await db.query(query, [h3Index]);

      if (rows.length === 0) return "Unknown Location";

      const lat = rows[0].coords.y;
      const lng = rows[0].coords.x;

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        console.error('Invalid coordinates:', { lat, lng });
        return "Unknown Location";
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'StreetSafe-App/1.0'
          }
        }
      );

      if (!response.ok) return "Unknown Location";

      const data = await response.json();
      const address = data.address || {};

      const locationParts = [
        address.neighbourhood || address.suburb,
        address.city || address.town || address.village,
        address.county
      ].filter(Boolean);

      // remove duplicates while preserving order
      const uniqueLocationParts = locationParts.filter((part, index, array) => 
        array.indexOf(part) === index
      );

      return uniqueLocationParts.length > 0 ? uniqueLocationParts.join(', ') : "Unknown Location";

    } catch (error) {
      console.error('Error getting location name:', error);
      return "Unknown Location";
    }
  }

  static formatCrimeData(rawData) {
    return rawData.map(row => [
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
      parseInt(row.vehicle_crime) || 0
    ]);
  }

  static async formatCrimeDataWithLocation(rawData) {
    const formattedData = await Promise.all(
      rawData.map(async (row) => {
        const locationName = await this.getLocationNameFromH3(row.h3_low_res);
        return {
          h3: row.h3_low_res,
          name: locationName,
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
            parseInt(row.vehicle_crime) || 0
          ]
        };
      })
    );
    return formattedData;
  }
}

module.exports = Crime;






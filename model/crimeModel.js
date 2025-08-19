const db = require("../database/connect");
class Crime {
  static async getCrimeDataByH3(startDate = '2020-01-01') {
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
        WHERE date >= $1
        GROUP BY h3_low_res;
      `;
      const values = [startDate];
      const { rows } = await db.query(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
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
}
module.exports = Crime;






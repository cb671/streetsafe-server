const db = require("../database/connect");
const h3 = require("h3-js");

class EmergencyServices {
  static async findClosestService(h3Index) {
    const resolution = 9; // normalize everything
    const inputNorm = h3.h3ToParent(h3Index, resolution);

    // pull all police + hospitals, already as H3 index strings
    const { rows } = await db.query(`
      SELECT name, type, h3::h3index AS h3
      FROM emergency_services
      WHERE type IN ('police', 'NHS Hospital')
    `);

    let closest = {
      police: null,
      hospital: null,
    };

    for (const row of rows) {
      try {
        // normalize resolution
        const dbNorm = h3.h3ToParent(row.h3, resolution);

        // compute grid distance
        const distance = h3.h3Distance(inputNorm, dbNorm);

        if (row.type === "police") {
          if (!closest.police || distance < closest.police.distance) {
            closest.police = {
              name: row.name,
              type: row.type,
              h3: row.h3, // already H3 index string
              distance,
            };
          }
        } else if (row.type === "NHS Hospital") {
          if (!closest.hospital || distance < closest.hospital.distance) {
            closest.hospital = {
              name: row.name,
              type: row.type,
              h3: row.h3, // already H3 index string
              distance,
            };
          }
        }
      } catch (err) {
        console.error("⚠️ Error processing row:", row, err);
      }
    }

    //return closest;
    // Before returning
    const result = {
        police: closest.police
            ? { name: closest.police.name, type: closest.police.type, h3: closest.police.h3 }
            : null,
        hospital: closest.hospital
            ? { name: closest.hospital.name, type: closest.hospital.type, h3: closest.hospital.h3 }
            : null
        };
    return result;
  

  }
}

module.exports = EmergencyServices;

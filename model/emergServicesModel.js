const db = require("../database/connect");
const h3 = require("h3-js");

class EmergencyServices {
  static async findClosestService(h3Index) {
    const resolution = 9; // normalize everything
    const inputNorm = h3.h3ToParent(h3Index, resolution);

    // pull all police + hospitals
    const { rows } = await db.query(`
      SELECT name, type, h3
      FROM emergency_services
      WHERE type IN ('police', 'NHS Hospital')
    `);

    let closest = {
      police: null,
      hospital: null,
    };

    for (const row of rows) {
      try {
        // Convert bigint → hex → h3 index string
        const dbH3Str = BigInt(row.h3).toString(16);

        // normalize resolution
        const dbNorm = h3.h3ToParent(dbH3Str, resolution);

        //çconsole.log(h3.h3GetResolution(dbNorm));


        // compute grid distance
        const distance = h3.h3Distance(inputNorm, dbNorm);



        if (row.type === "police") {
          if (!closest.police || distance < closest.police.distance) {
            closest.police = {
              name: row.name,
              type: row.type,
              h3: row.h3.toString(),
              distance,
            };
          }
        } else if (row.type === "NHS Hospital") {
          if (!closest.hospital || distance < closest.hospital.distance) {
            closest.hospital = {
              name: row.name,
              type: row.type,
              h3: row.h3.toString(),
              distance,
            };
          }
        }
      } catch (err) {
        console.error("⚠️ Error processing row:", row, err);
      }
    }



    return closest;
  }
}

module.exports = EmergencyServices;

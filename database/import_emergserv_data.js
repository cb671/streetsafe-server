const fs = require('fs');
const csv = require('csv-parser');
const h3 = require('h3-js');
const proj4 = require('proj4');
const { Pool } = require('pg');
require('dotenv').config();

// Set up DB connection
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
});

// Define projection from EPSG:3857 -> EPSG:4326
const mercator = '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs';
const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';

async function importCSV(filePath) {
  const client = await pool.connect();
  let skippedRows = 0;
  let insertedRows = 0;
  let firstRow = true;

  try {
    await client.query('BEGIN');

    const stream = fs
      .createReadStream(filePath)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim() }));

    for await (const row of stream) {
      try {
        // Detect coordinate system
        const isMercator = row.x && row.y;
        const isLatLng = row.latitude && row.longitude;

        let lng, lat;

        if (isMercator) {
          const x = parseFloat(row.x);
          const y = parseFloat(row.y);

          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            console.warn(`⚠️ Skipping row with invalid Mercator coords: ${JSON.stringify(row)}`);
            skippedRows++;
            continue;
          }

          [lng, lat] = proj4(mercator, wgs84, [x, y]);
        } else if (isLatLng) {
          lng = parseFloat(row.longitude);
          lat = parseFloat(row.latitude);

          if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            console.warn(`⚠️ Skipping row with invalid lat/lng: ${JSON.stringify(row)}`);
            skippedRows++;
            continue;
          }
        } else {
          console.warn(`⚠️ Skipping row with missing coords: ${JSON.stringify(row)}`);
          skippedRows++;
          continue;
        }

        if (firstRow) {
          console.log('✅ First row detected:', row);
          console.log('✅ Parsed coordinates:', { lng, lat });
          firstRow = false;
        }

        // H3 resolution
        const resolution = 9;
        const h3IndexStr = h3.geoToH3(lat, lng, resolution);
        const h3IndexBigInt = BigInt('0x' + h3IndexStr);

        // Insert into table
        await client.query(
          `INSERT INTO emergency_services (h3, type, name) VALUES ($1, $2, $3)`,
          [h3IndexBigInt, row.type, row.name]
        );

        insertedRows++;
      } catch (innerErr) {
        console.warn(`⚠️ Skipping row due to error: ${JSON.stringify(row)} | ${innerErr.message}`);
        skippedRows++;
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ CSV import complete! Inserted rows: ${insertedRows}, Skipped rows: ${skippedRows}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing CSV:', err);
  } finally {
    client.release();
  }
}


// Run the script
importCSV('./data/police_stations.csv');
importCSV('./data/hospitals.csv');

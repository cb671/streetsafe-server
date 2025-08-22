const fs = require('fs');
const csv = require('csv-parser');
const h3 = require('h3-js');
const { Pool } = require('pg');
require('dotenv').config();

// Set up DB connection
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
});

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
        // Parse latitude/longitude
        const lat = parseFloat(row.latitude);
        const lng = parseFloat(row.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          console.warn(`Skipping row with invalid coordinates: ${JSON.stringify(row)}`);
          skippedRows++;
          continue;
        }

        if (firstRow) {
          console.log('First row detected:', row);
          console.log('Parsed coordinates:', { lat, lng });
          firstRow = false;
        }

        // H3 resolution
        const resolution = 9;
        const h3IndexStr = h3.geoToH3(lat, lng, resolution);
        const h3IndexBigInt = BigInt('0x' + h3IndexStr);

        // Insert into table (h3, type, name)
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
    console.log(`CSV import complete! Inserted rows: ${insertedRows}, Skipped rows: ${skippedRows}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error importing CSV:', err);
  } finally {
    client.release();
  }
}

// Run the scripts for both CSVs
//importCSV('./data/police_stations_converted.csv');
//importCSV('./data/hospitals.csv');

const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const h3 = require("h3-js");
require("dotenv").config();

const db = require("./connect");

const DEFAULT_H3_RESOLUTION = parseInt(process.env.CRIME_H3_RESOLUTION || "9", 10);
const BATCH_SIZE = 500;

const CATEGORY_MAP = {
  "anti-social behaviour": "anti_social",
  burglary: "burglary",
  "bicycle theft": "bicycle_theft",
  "criminal damage and arson": "damage",
  "criminal damage & arson": "damage",
  drugs: "drugs",
  robbery: "robbery",
  shoplifting: "shoplifting",
  "theft from the person": "personal_theft",
  "possession of weapons": "weapon_crime",
  "violent crime": "violent",
  "vehicle crime": "vehicle_crime"
};

function getSourceDirectory() {
  const cliArg = process.argv[2];
  const configuredDir = process.env.POLICE_DATA_DIR;
  const sourceDir = cliArg || configuredDir;

  if (!sourceDir) {
    throw new Error(
      "Provide the police data folder path as an argument or set POLICE_DATA_DIR in .env"
    );
  }

  return path.resolve(process.cwd(), sourceDir);
}

function isStreetCrimeCsv(fileName) {
  return fileName.toLowerCase().endsWith("-street.csv");
}

async function findStreetCrimeCsvFiles(rootDir) {
  const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await findStreetCrimeCsvFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && isStreetCrimeCsv(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function groupFilesByMonth(files) {
  return files.reduce((groups, filePath) => {
    const monthKey = path.basename(path.dirname(filePath));
    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey).push(filePath);
    return groups;
  }, new Map());
}

function normaliseCrimeType(rawCrimeType) {
  if (!rawCrimeType) return null;
  return CATEGORY_MAP[rawCrimeType.trim().toLowerCase()] || null;
}

function createEmptyCounts() {
  return {
    burglary: 0,
    personal_theft: 0,
    weapon_crime: 0,
    bicycle_theft: 0,
    damage: 0,
    robbery: 0,
    shoplifting: 0,
    violent: 0,
    anti_social: 0,
    drugs: 0,
    vehicle_crime: 0
  };
}

function getAggregateKey(month, h3Index) {
  return `${month}|${h3Index}`;
}

function h3IndexToDbValue(h3Index) {
  return BigInt(`0x${h3Index}`).toString(10);
}

function parseCsvFile(filePath, aggregates, stats) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
      .on("data", (row) => {
        stats.rowsRead += 1;

        const lat = parseFloat(row.Latitude);
        const lng = parseFloat(row.Longitude);
        const month = row.Month ? row.Month.trim() : "";
        const category = normaliseCrimeType(row["Crime type"]);

        if (!month) {
          stats.skippedMissingMonth += 1;
          return;
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          stats.skippedMissingCoords += 1;
          return;
        }

        if (!category) {
          stats.skippedUnsupportedCategory += 1;
          return;
        }

        const h3Index = h3.geoToH3(lat, lng, DEFAULT_H3_RESOLUTION);
        const h3DbValue = h3IndexToDbValue(h3Index);
        const key = getAggregateKey(month, h3DbValue);

        if (!aggregates.has(key)) {
          aggregates.set(key, {
            date: `${month}-01`,
            h3: h3DbValue,
            ...createEmptyCounts()
          });
        }

        aggregates.get(key)[category] += 1;
        stats.rowsImported += 1;
      })
      .on("end", resolve)
      .on("error", reject);
  });
}

async function ensureCrimeAreasTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS crime_areas (
      id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      date DATE NOT NULL,
      h3 TEXT NOT NULL,
      burglary INT NOT NULL DEFAULT 0,
      personal_theft INT NOT NULL DEFAULT 0,
      weapon_crime INT NOT NULL DEFAULT 0,
      bicycle_theft INT NOT NULL DEFAULT 0,
      damage INT NOT NULL DEFAULT 0,
      robbery INT NOT NULL DEFAULT 0,
      shoplifting INT NOT NULL DEFAULT 0,
      violent INT NOT NULL DEFAULT 0,
      anti_social INT NOT NULL DEFAULT 0,
      drugs INT NOT NULL DEFAULT 0,
      vehicle_crime INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT now(),
      UNIQUE (date, h3)
    );

    CREATE INDEX IF NOT EXISTS crime_areas_date_idx ON crime_areas(date);
    CREATE INDEX IF NOT EXISTS crime_areas_h3_idx ON crime_areas(h3);
  `;

  await db.query(query);
}

async function upsertBatch(batch) {
  const values = [];
  const placeholders = batch
    .map((row, index) => {
      const offset = index * 13;
      values.push(
        row.date,
        row.h3,
        row.burglary,
        row.personal_theft,
        row.weapon_crime,
        row.bicycle_theft,
        row.damage,
        row.robbery,
        row.shoplifting,
        row.violent,
        row.anti_social,
        row.drugs,
        row.vehicle_crime
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`;
    })
    .join(", ");

  const query = `
    INSERT INTO crime_areas (
      date,
      h3,
      burglary,
      personal_theft,
      weapon_crime,
      bicycle_theft,
      damage,
      robbery,
      shoplifting,
      violent,
      anti_social,
      drugs,
      vehicle_crime
    )
    VALUES ${placeholders}
    ON CONFLICT (date, h3)
    DO UPDATE SET
      burglary = EXCLUDED.burglary,
      personal_theft = EXCLUDED.personal_theft,
      weapon_crime = EXCLUDED.weapon_crime,
      bicycle_theft = EXCLUDED.bicycle_theft,
      damage = EXCLUDED.damage,
      robbery = EXCLUDED.robbery,
      shoplifting = EXCLUDED.shoplifting,
      violent = EXCLUDED.violent,
      anti_social = EXCLUDED.anti_social,
      drugs = EXCLUDED.drugs,
      vehicle_crime = EXCLUDED.vehicle_crime
  `;

  await db.query(query, values);
}

async function writeAggregatesToDb(aggregates) {
  const rows = Array.from(aggregates.values());

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    await upsertBatch(batch);
  }

  return rows.length;
}

async function main() {
  const sourceDir = getSourceDirectory();

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Police data directory not found: ${sourceDir}`);
  }

  const stats = {
    filesProcessed: 0,
    rowsRead: 0,
    rowsImported: 0,
    skippedMissingCoords: 0,
    skippedMissingMonth: 0,
    skippedUnsupportedCategory: 0
  };

  const files = await findStreetCrimeCsvFiles(sourceDir);

  if (files.length === 0) {
    throw new Error(`No *-street.csv files found under ${sourceDir}`);
  }

  await ensureCrimeAreasTable();
  const filesByMonth = groupFilesByMonth(files);
  let rowsUpserted = 0;

  for (const [month, monthFiles] of Array.from(filesByMonth.entries()).sort()) {
    console.log(`Starting month ${month} (${monthFiles.length} files)`);
    const monthAggregates = new Map();

    for (const file of monthFiles) {
      stats.filesProcessed += 1;
      console.log(`Processing ${file}`);
      await parseCsvFile(file, monthAggregates, stats);
    }

    rowsUpserted += await writeAggregatesToDb(monthAggregates);
    console.log(`Finished month ${month} with ${monthAggregates.size} aggregated rows`);
  }

  console.log("Crime import complete.");
  console.log(`Source directory: ${sourceDir}`);
  console.log(`H3 resolution: ${DEFAULT_H3_RESOLUTION}`);
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Rows read: ${stats.rowsRead}`);
  console.log(`Rows imported into aggregates: ${stats.rowsImported}`);
  console.log(`Aggregated rows upserted: ${rowsUpserted}`);
  console.log(`Skipped rows without coordinates: ${stats.skippedMissingCoords}`);
  console.log(`Skipped rows without month: ${stats.skippedMissingMonth}`);
  console.log(`Skipped rows with unsupported categories: ${stats.skippedUnsupportedCategory}`);
}

main()
  .catch((error) => {
    console.error("Crime import failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });

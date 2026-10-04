require("dotenv").config();
const db = require("./connect");

const migrate = async () => {
  try {
    await db.query(`
            ALTER TABLE map_area_references
            ADD COLUMN IF NOT EXISTS street_name TEXT;
            `);

    console.log("Street name column added successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
};

migrate();

const fs = require("node:fs/promises");
const path = require("node:path");
const db = require("./connect");

async function migrate() {
  try {
    const sqlPath = path.join(__dirname, "addResourceBookmarks.sql");
    const sql = await fs.readFile(sqlPath, "utf-8");
    await db.query(sql);
    console.log("Bookmarks table created successfully");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

migrate();

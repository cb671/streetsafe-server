const fs = require("fs");
const path = require("path");

const db = require("./connect");

function getEducationalStatements() {
  const setupSqlPath = path.join(__dirname, "setup.sql");
  const setupSql = fs.readFileSync(setupSqlPath, "utf8");

  const createTableMatch = setupSql.match(/CREATE TABLE educational_sources \([\s\S]*?\);/);
  const seedMatch = setupSql.match(/INSERT INTO educational_sources[\s\S]*?;/);

  if (!createTableMatch || !seedMatch) {
    throw new Error("Educational resource schema could not be loaded from database/setup.sql");
  }

  const createTableSql = createTableMatch[0].replace(
    "CREATE TABLE educational_sources",
    "CREATE TABLE IF NOT EXISTS educational_sources"
  );

  return {
    createTableSql,
    seedSql: seedMatch[0]
  };
}

async function ensureEducationalSources() {
  const { createTableSql, seedSql } = getEducationalStatements();

  await db.query(createTableSql);

  const countQuery = "SELECT COUNT(*)::int AS count FROM educational_sources";
  const {
    rows: [row]
  } = await db.query(countQuery);

  if (row.count === 0) {
    await db.query(seedSql);
  }
}

module.exports = {
  ensureEducationalSources,
  getEducationalStatements
};

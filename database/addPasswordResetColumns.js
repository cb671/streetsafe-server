const db = require("./connect");

const alterTable = `
    ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(64),
        ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;`;

async function migrate() {
  try {
    await db.query(alterTable);
    console.log("Password reset columns added successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

migrate();

require("dotenv").config();
const db = require("./connect");

const migrate = async () => {
  try {
    await db.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS email_confirmation_token_hash VARCHAR(64),
            ADD COLUMN IF NOT EXISTS email_confirmation_expires_at TIMESTAMP;

            CREATE UNIQUE INDEX IF NOT EXISTS users_confirmation_token_hash_idx 
            ON users(email_confirmation_token_hash)
            WHERE email_confirmation_token_hash IS NOT NULL;
        `);

    console.log("Email confirmation columns added successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
};

migrate();

const db = require("../database/connect");
const { getConfigStatus } = require("../config/env");

class HealthController {
  static async getHealth(req, res) {
    const config = getConfigStatus();

    let database = {
      ok: false,
      status: "not_configured"
    };

    if (config.missing.includes("DB_URL")) {
      database = {
        ok: false,
        status: "not_configured"
      };
    } else {
      try {
        await db.query("SELECT 1");
        database = {
          ok: true,
          status: "up"
        };
      } catch (error) {
        database = {
          ok: false,
          status: "down",
          message: error.message
        };
      }
    }

    const ok = config.ok && database.ok;

    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      checks: {
        config: {
          ok: config.ok,
          missing: config.missing
        },
        database
      }
    });
  }
}

module.exports = HealthController;

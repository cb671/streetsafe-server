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

    let valhalla = {
      ok: false,
      status: "not_configured"
    };

    if (config.missing.includes("VALHALLA_URL")) {
      valhalla = {
        ok: false,
        status: "not_configured"
      };
    } else {
      try {
        const response = await fetch(process.env.VALHALLA_URL, {
          signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
        });
        valhalla = {
          ok: true,
          status: "up",
          httpStatus: response.status
        };
      } catch (error) {
        valhalla = {
          ok: false,
          status: "down",
          message: error.message
        };
      }
    }

    const ok = config.ok && database.ok && valhalla.ok;

    res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      checks: {
        config: {
          ok: config.ok,
          missing: config.missing
        },
        database,
        valhalla
      }
    });
  }
}

module.exports = HealthController;

jest.mock("../database/connect", () => ({
  query: jest.fn()
}));

const db = require("../database/connect");
const HealthController = require("../controller/healthController");

describe("health controller", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      DB_URL: "postgres://example",
      JWT_SECRET: "secret",
      VALHALLA_URL: "http://localhost:8002",
      MAPS_API_KEY: "maps-key",
      BREVO_API_KEY: "brevo-key",
      BREVO_CONFIRMATION_TEMPLATE_ID: "42",
      EMAIL_CONFIRMATION_URL: "https://example.com/confirm-email"
    };
    global.fetch = jest.fn();
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("returns ok when config is complete and the database responds", async () => {
    db.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    global.fetch.mockResolvedValue({ status: 405 });

    await HealthController.getHealth({}, res);

    expect(db.query).toHaveBeenCalledWith("SELECT 1");
    expect(global.fetch).toHaveBeenCalledWith("http://localhost:8002", expect.any(Object));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: "ok",
      checks: {
        config: {
          ok: true,
          missing: []
        },
        database: {
          ok: true,
          status: "up"
        },
        valhalla: {
          ok: true,
          status: "up",
          httpStatus: 405
        }
      }
    });
  });

  it("returns degraded when the database query fails", async () => {
    db.query.mockRejectedValue(new Error("connect ECONNREFUSED"));
    global.fetch.mockResolvedValue({ status: 405 });

    await HealthController.getHealth({}, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: "degraded",
      checks: {
        config: {
          ok: true,
          missing: []
        },
        database: {
          ok: false,
          status: "down",
          message: "connect ECONNREFUSED"
        },
        valhalla: {
          ok: true,
          status: "up",
          httpStatus: 405
        }
      }
    });
  });

  it("returns degraded when required config is missing", async () => {
    delete process.env.MAPS_API_KEY;
    db.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    global.fetch.mockResolvedValue({ status: 405 });

    await HealthController.getHealth({}, res);

    expect(db.query).toHaveBeenCalledWith("SELECT 1");
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: "degraded",
      checks: {
        config: {
          ok: false,
          missing: ["MAPS_API_KEY"]
        },
        database: {
          ok: true,
          status: "up"
        },
        valhalla: {
          ok: true,
          status: "up",
          httpStatus: 405
        }
      }
    });
  });

  it("returns degraded when Valhalla cannot be reached", async () => {
    db.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    global.fetch.mockRejectedValue(new Error("fetch failed"));

    await HealthController.getHealth({}, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: "degraded",
      checks: {
        config: {
          ok: true,
          missing: []
        },
        database: {
          ok: true,
          status: "up"
        },
        valhalla: {
          ok: false,
          status: "down",
          message: "fetch failed"
        }
      }
    });
  });
});

const { assertStartupConfig, getConfigStatus, getMissingEnvVars } = require("../config/env");

describe("environment configuration", () => {
  it("reports missing required environment variables", () => {
    const env = {
      DB_URL: "postgres://example",
      JWT_SECRET: "",
      VALHALLA_URL: "http://localhost:8002"
    };

    expect(getMissingEnvVars(env)).toEqual(["JWT_SECRET", "MAPS_API_KEY"]);
  });

  it("returns a healthy config status when all required variables are present", () => {
    const env = {
      DB_URL: "postgres://example",
      JWT_SECRET: "secret",
      VALHALLA_URL: "http://localhost:8002",
      MAPS_API_KEY: "maps-key"
    };

    expect(getConfigStatus(env)).toEqual({
      ok: true,
      required: ["DB_URL", "JWT_SECRET", "VALHALLA_URL", "MAPS_API_KEY"],
      missing: []
    });
  });

  it("throws during startup when required environment variables are missing", () => {
    expect(() =>
      assertStartupConfig({
        DB_URL: "postgres://example",
        JWT_SECRET: "secret"
      })
    ).toThrow("Missing required environment variables: VALHALLA_URL, MAPS_API_KEY");
  });
});

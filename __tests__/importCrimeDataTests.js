jest.mock("../database/connect", () => ({
  query: jest.fn(),
  end: jest.fn()
}));

const {
  CATEGORY_MAP,
  normaliseCrimeType,
  isStreetCrimeCsv
} = require("../database/import_crime_data");

describe("crime import category normalization", () => {
  it("recognizes street crime CSV file names", () => {
    expect(isStreetCrimeCsv("2025-01-avon-and-somerset-street.csv")).toBe(true);
    expect(isStreetCrimeCsv("2025-01-avon-and-somerset-outcomes.csv")).toBe(false);
  });

  it("maps common Police.uk categories into supported analytics buckets", () => {
    expect(normaliseCrimeType("Violence and sexual offences")).toBe("violent");
    expect(normaliseCrimeType("Public order")).toBe("anti_social");
    expect(normaliseCrimeType("Other theft")).toBe("personal_theft");
    expect(normaliseCrimeType("Other crime")).toBe("damage");
  });

  it("keeps existing supported categories working case-insensitively", () => {
    expect(normaliseCrimeType("Anti-social behaviour")).toBe("anti_social");
    expect(normaliseCrimeType("Bicycle theft")).toBe("bicycle_theft");
    expect(normaliseCrimeType("Vehicle crime")).toBe("vehicle_crime");
  });

  it("returns null for unknown categories", () => {
    expect(normaliseCrimeType("Fraud")).toBeNull();
    expect(normaliseCrimeType("")).toBeNull();
    expect(normaliseCrimeType(null)).toBeNull();
  });

  it("exposes the expected bucket mapping keys", () => {
    expect(CATEGORY_MAP["violence and sexual offences"]).toBe("violent");
    expect(CATEGORY_MAP["public order"]).toBe("anti_social");
    expect(CATEGORY_MAP["other theft"]).toBe("personal_theft");
    expect(CATEGORY_MAP["other crime"]).toBe("damage");
  });
});

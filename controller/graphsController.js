const GraphsModel = require("../model/graphsModel");
const { createHttpError } = require("../utils/httpError");

const CRIME_TYPES = [
  "burglary",
  "personal_theft",
  "weapon_crime",
  "bicycle_theft",
  "damage",
  "robbery",
  "shoplifting",
  "violent",
  "anti_social",
  "drugs",
  "vehicle_crime"
];

const parseDateParam = (value, fieldName) => {
  if (value === undefined) return undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createHttpError(400, `${fieldName} must be in YYYY-MM-DD format`, {
      error: "Bad request"
    });
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
    throw createHttpError(400, `${fieldName} must be a valid date`, {
      error: "Bad request"
    });
  }

  return value;
};

const parseRadius = (value) => {
  if (value === undefined) return 3;

  const parsedRadius = Number(value);
  if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
    throw createHttpError(400, "radius must be a positive number", {
      error: "Bad request"
    });
  }

  return parsedRadius;
};

const parseCrimeTypes = (value) => {
  if (value === undefined) return undefined;

  const parsedCrimeTypes = (Array.isArray(value) ? value : value.split(","))
    .map((crimeType) => String(crimeType).trim())
    .filter(Boolean);

  if (parsedCrimeTypes.length === 0) {
    throw createHttpError(400, "crimeTypes must contain at least one valid crime type", {
      error: "Bad request"
    });
  }

  const invalidCrimeTypes = parsedCrimeTypes.filter((crimeType) => !CRIME_TYPES.includes(crimeType));
  if (invalidCrimeTypes.length > 0) {
    throw createHttpError(400, `Unsupported crimeTypes: ${invalidCrimeTypes.join(", ")}`, {
      error: "Bad request"
    });
  }

  return parsedCrimeTypes;
};

const validateGraphQuery = (query, { allowGroupBy = false } = {}) => {
  const startDate = parseDateParam(query.startDate ?? "2020-01-01", "startDate");
  const endDate = parseDateParam(query.endDate, "endDate");

  if (endDate && startDate > endDate) {
    throw createHttpError(400, "startDate must be before or equal to endDate", {
      error: "Bad request"
    });
  }

  const location = typeof query.location === "string" ? query.location.trim() : query.location;
  if (query.location !== undefined && !location) {
    throw createHttpError(400, "location must be a non-empty string", {
      error: "Bad request"
    });
  }

  const radius = parseRadius(query.radius);
  const crimeTypes = parseCrimeTypes(query.crimeTypes);

  let groupBy = "month";
  if (allowGroupBy) {
    groupBy = query.groupBy ?? "month";
    if (!["month", "year"].includes(groupBy)) {
      throw createHttpError(400, 'groupBy must be "month" or "year"', {
        error: "Bad request"
      });
    }
  }

  return {
    startDate,
    endDate,
    location,
    radius,
    crimeTypes,
    groupBy
  };
};

class GraphsController {
  static async getCrimeTotals(req, res) {
    const { startDate, endDate, location, radius, crimeTypes } = validateGraphQuery(req.query);

    const data = await GraphsModel.getCrimeTotalsByCategory(
      startDate,
      endDate,
      location,
      radius,
      crimeTypes
    );

    res.json(data);
  }

  static async getCrimeTrends(req, res) {
    const { startDate, endDate, location, radius, crimeTypes, groupBy } = validateGraphQuery(req.query, {
      allowGroupBy: true
    });

    const data = await GraphsModel.getCrimeTrends(
      startDate,
      endDate,
      location,
      radius,
      crimeTypes,
      groupBy
    );

    res.json(data);
  }

  static async getCrimeProportions(req, res) {
    const { startDate, endDate, location, radius, crimeTypes } = validateGraphQuery(req.query);

    const data = await GraphsModel.getCrimeProportions(
      startDate,
      endDate,
      location,
      radius,
      crimeTypes
    );

    res.json(data);
  }

  static async getAvailableLocations(req, res) {
    const data = await GraphsModel.getAvailableLocations();
    res.json(data);
  }

  static async getDateRange(req, res) {
    const data = await GraphsModel.getDateRange();
    res.json(data);
  }

  static async getCrimeTypes(req, res) {
    res.json(CRIME_TYPES);
  }
}

module.exports = GraphsController;

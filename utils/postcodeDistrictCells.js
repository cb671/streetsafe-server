const fs = require("node:fs/promises");

const path = require("node:path");

// The backend uses H3 version 3, where this function is called polyfill.
const { polyfill } = require("h3-js");

// Build the path from this utils folder to GeoJSON folder.
const boundaryDirectory = path.join(
  __dirname,
  "..",
  "data",
  "uk-postcode-polygons-master",
  "geojson",
);

// Remember previously calculated results until the server restarts.
const districtCache = new Map();

// Accept an outward code, such as "N16", and return its H3 cells -
// so this function can work with partial UK postcodes, not just full ones
async function getDistrictCells(outwardCode) {
  // Reject missing values and values that are not strings.
  if (typeof outwardCode !== "string" || !outwardCode.trim()) {
    throw new Error("An outward code is required");
  }

  // Make inputs such as " n16 " become "N16".
  const normalizedCode = outwardCode.trim().toUpperCase();

  // Capture the postcode-area letters and validate the remaining format.
  const match = normalizedCode.match(/^([A-Z]{1,2})\d[A-Z\d]?$/);

  // Reject full postcodes, arbitrary text, and filesystem path characters.
  if (!match) {
    throw new Error("Enter an outward code such as N16");
  }

  // Return a copy of the cached result if we already calculated it.
  if (districtCache.has(normalizedCode)) {
    return [...districtCache.get(normalizedCode)];
  }

  // The first captured group contains the area letters: "N16" becomes "N".
  const postcodeArea = match[1];

  // Build the filename, for example geojson/N.geojson.
  const filePath = path.join(boundaryDirectory, `${postcodeArea}.geojson`);

  // This variable will hold the file contents as text.

  let fileContents;

  try {
    // Read the file without blocking other server requests.
    fileContents = await fs.readFile(filePath, "utf8");
  } catch (error) {
    // ENOENT ("Error NO ENTry") means that the requested file does not exist.

    if (error.code === "ENOENT") {
      throw new Error(`Boundary data unavailable for ${normalizedCode}`);
    }

    // Preserve other errors, such as a file-permission problem.
    throw error;
  }

  // Convert the JSON text into a JavaScript object.
  const collection = JSON.parse(fileContents);

  // Check that the file contains the expected GeoJSON structure.
  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features)
  ) {
    throw new Error(`Invalid boundary file for ${postcodeArea}`);
  }

  // Find the district with the matching name.
  const district = collection.features.find(
    (feature) => feature.properties?.name === normalizedCode,
  );

  // A valid-looking code may still be absent from this dataset.
  if (!district) {
    throw new Error(`Boundary data unavailable for ${normalizedCode}`);
  }

  // Extract the district's geographic shape.
  const geometry = district.geometry;

  // Supports both single polygons and districts with multiple pieces.
  if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) {
    throw new Error(`Unsupported boundary geometry for ${normalizedCode}`);
  }

  // Represent either geometry type as an array of polygons.
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  // Convert every polygon to resolution-9 cells, then flatten the results.
  const cells = polygons.flatMap((polygon) => polyfill(polygon, 9, true));

  // Remove duplicates where polygon results contain the same cell.
  const uniqueCells = [...new Set(cells)];

  // Avoid silently returning an area with nothing to highlight.
  if (uniqueCells.length === 0) {
    throw new Error(`No resolution-9 cells found for ${normalizedCode}`);
  }

  // Save the result for subsequent requests for this district.
  districtCache.set(normalizedCode, uniqueCells);

  // Return a copy so callers cannot accidentally modify the cached array.
  return [...uniqueCells];
}

// Allow other server files to import this function.
module.exports = { getDistrictCells };

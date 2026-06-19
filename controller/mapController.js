const Crime = require("../model/mapModel");
const EmergencyServices = require("../model/emergServicesModel");
const { createHttpError } = require("../utils/httpError");



class MapController {
  static mapFeatureCache = new Map();
  static async getMapFeatures(req, res) {
    const startDate = req.query.startDate || '2020-01-01';
    const endDate = req.query.endDate || Date.now();

    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    for(let d of [parsedStart, parsedEnd]){
      d.setUTCDate(1);
      d.setUTCHours(0, 0,  0, 0);
    }
    const cacheKey = parsedStart + parsedEnd;
    if(MapController.mapFeatureCache.get(cacheKey)){
      return res.json(MapController.mapFeatureCache.get(cacheKey))
    }

    const rawCrimeData = await Crime.getCrimeDataByH3(parsedStart, parsedEnd);
    const formattedData = Crime.formatCrimeData(rawCrimeData);
    MapController.mapFeatureCache.set(cacheKey, formattedData);
    res.json(formattedData);
  }

  static async getSpecificHexagonData(req, res) {
    const { h3Index } = req.params;
    const startDate = req.query.startDate || '2020-01-01';
    const endDate = req.query.endDate || Date.now();

    if (!h3Index) {
      throw createHttpError(400, "H3 index is required", {
        error: "Bad request"
      });
    }
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    for(let d of [parsedStart, parsedEnd]){
      d.setUTCDate(1);
      d.setUTCHours(0, 0,  0, 0);
    }

    const rawCrimeData = await Crime.getCrimeDataBySpecificH3(h3Index, parsedStart, parsedEnd);


    if (!rawCrimeData) {
      throw createHttpError(404, "No data found for the specified H3 index", {
        error: "Not found"
      });
    }

    const formattedData = await Crime.formatCrimeDataWithLocation([rawCrimeData]);
    const closestServices = await EmergencyServices.findClosestService(h3Index);
    const response = {
      ...formattedData[0],
      emergencyServices: closestServices
    };
    res.json(response);
  }
}
module.exports = MapController;


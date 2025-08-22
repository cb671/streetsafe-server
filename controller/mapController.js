const Crime = require("../model/mapModel");
class MapController {
  static mapFeatureCache = new Map();
  static async getMapFeatures(req, res) {
    try {
      const startDate = req.query.startDate || '2025-01-01';
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
    } catch (error) {
      console.error("Error fetching police data:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }

  static async getSpecificHexagonData(req, res) {
    try {
      const { h3Index } = req.params;
      const startDate = req.query.startDate || '2025-01-01';
      const endDate = req.query.endDate || Date.now();

      if (!h3Index) {
        return res.status(400).json({
          error: "Bad request",
          message: "H3 index is required"
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
        return res.status(404).json({
          error: "Not found",
          message: "No data found for the specified H3 index"
        });
      }


      const formattedData = await Crime.formatCrimeDataWithLocation([rawCrimeData]);
      res.json(formattedData[0]);
    } catch (error) {
      console.error("Error fetching specific hexagon data:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }
}
module.exports = MapController;




const Crime = require("../model/mapModel");
class MapController {
  static async getMapFeatures(req, res) {
    try {
      const startDate = req.query.startDate || '2025-01-01';
      const rawCrimeData = await Crime.getCrimeDataByH3(startDate);
      const formattedData = Crime.formatCrimeData(rawCrimeData);
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
      
      if (!h3Index) {
        return res.status(400).json({
          error: "Bad request",
          message: "H3 index is required"
        });
      }

      const rawCrimeData = await Crime.getCrimeDataBySpecificH3(h3Index, startDate);
      
      if (!rawCrimeData) {
        return res.status(404).json({
          error: "Not found",
          message: "No data found for the specified H3 index"
        });
      }

      const formattedData = Crime.formatCrimeData([rawCrimeData]);
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




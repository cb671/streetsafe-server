
const Crime = require("../model/crimeModel");
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
}
module.exports = MapController;




const EmergencyServices = require('../model/emergServicesModel');

class EmergencyServicesController {
  static async getClosest(req, res) {
    try {
      const { h3Index } = req.query;

      if (!h3Index) {
        return res.status(400).json({
          success: false,
          error: "Missing h3Index"
        });
      }

      // Use the new model method that returns both police + hospital
      const closest = await EmergencyServices.findClosestService(h3Index);

      return res.json({
        success: true,
        data: closest
      });

    } catch (err) {
      console.error("Error fetching closest services:", err);
      return res.status(500).json({
        success: false,
        error: "Server error"
      });
    }
  }
}

module.exports = EmergencyServicesController;

const EmergencyServices = require("../model/emergServicesModel");
const { createHttpError } = require("../utils/httpError");

class EmergServicesController {
  static async getClosest(req, res) {
    const { h3Index } = req.query;

    if (!h3Index) {
      throw createHttpError(400, "H3 index is required", {
        error: "Bad request"
      });
    }

    const services = await EmergencyServices.findClosestService(h3Index);
    res.json({ h3Index, services });
  }
}

module.exports = EmergServicesController;

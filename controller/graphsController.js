const GraphsModel = require("../model/graphsModel");

class GraphsController {
  static async getCrimeTotals(req, res) {
    try {
      const { 
        startDate = '2020-01-01', 
        endDate,
        location,        
        radius = 3,      
        crimeTypes 
      } = req.query;

      const data = await GraphsModel.getCrimeTotalsByCategory(
        startDate, 
        endDate, 
        location, 
        radius, 
        crimeTypes
      );
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching crime totals:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }

  // Line chart - crime trends over time
  static async getCrimeTrends(req, res) {
    try {
      const { 
        startDate = '2020-01-01', 
        endDate,
        location,        
        radius = 3,      
        crimeTypes,
        groupBy = 'month' 
      } = req.query;

      const data = await GraphsModel.getCrimeTrends(
        startDate, 
        endDate, 
        location, 
        radius, 
        crimeTypes,
        groupBy
      );
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching crime trends:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }

  // Pie chart - crime proportions
  static async getCrimeProportions(req, res) {
    try {
      const { 
        startDate = '2020-01-01', 
        endDate,
        location,        
        radius = 3,      
        crimeTypes 
      } = req.query;

      const data = await GraphsModel.getCrimeProportions(
        startDate, 
        endDate, 
        location, 
        radius, 
        crimeTypes
      );
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching crime proportions:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }

  static async getAvailableLocations(req, res) {
    try {
      const data = await GraphsModel.getAvailableLocations();
      res.json(data);
    } catch (error) {
      console.error("Error fetching available locations:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }

  static async getDateRange(req, res) {
    try {
      const data = await GraphsModel.getDateRange();
      res.json(data);
    } catch (error) {
      console.error("Error fetching date range:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }

  static async getCrimeTypes(req, res) {
    try {
      const crimeTypes = [
        'burglary',
        'personal_theft',
        'weapon_crime',
        'bicycle_theft',
        'damage',
        'robbery',
        'shoplifting',
        'violent',
        'anti_social',
        'drugs',
        'vehicle_crime'
      ];
      res.json(crimeTypes);
    } catch (error) {
      console.error("Error fetching crime types:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }
}

module.exports = GraphsController;
const EducationalResources = require("../model/educationalModel");
const User = require("../model/userModel");


class EducationalController {
  static async getResources(req, res) {
    try {
      let resources;
      let isPersonalised = false;
      let userLocation = null;
      let topCrimes = null;

      const wantsPersonalised = req.query.personalised !== 'false';

      if (req.userId && wantsPersonalised) {
        try {
          const user = await User.findById(req.userId);
          
          if (user && user.h3) {
            resources = await EducationalResources.getTailoredResources(user.h3);
            isPersonalised = true;
            
            const Crime = require("../model/mapModel");
            userLocation = await Crime.getLocationNameFromH3(user.h3);
            
            if (resources.length > 0 && resources[0].top_local_crimes) {
              topCrimes = resources[0].top_local_crimes;
            }
          } else {
            resources = await EducationalResources.getAllResources();
          }
        } catch (userError) {
          console.error('Error getting user data:', userError);
          resources = await EducationalResources.getAllResources();
        }
      } else {
        resources = await EducationalResources.getAllResources();
      }

      res.json({
        resources,
        personalisation: {
          isPersonalised,
          userLocation,
          topLocalCrimes: topCrimes
        }
      });

    } catch (error) {
      console.error("Error fetching educational resources:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }


  
  static async getResourcesByCrimeType(req, res) {
    try {
      const { crimeType } = req.params;
      
      if (!crimeType) {
        return res.status(400).json({
          error: "Crime type is required"
        });
      }

      const resources = await EducationalResources.getResourcesByCrimeTypes([crimeType]);
      
      res.json({
        resources,
        crimeType,
        personalisation: {
          isPersonalised: false
        }
      });

    } catch (error) {
      console.error("Error fetching resources by crime type:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }

}

module.exports = EducationalController;
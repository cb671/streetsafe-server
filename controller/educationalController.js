const EducationalResources = require("../model/educationalModel");
const User = require("../model/userModel");
const { createHttpError } = require("../utils/httpError");


class EducationalController {
  static async getResources(req, res) {
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
  }


  
  static async getResourcesByCrimeType(req, res) {
    const { crimeType } = req.params;
    
    if (!crimeType) {
      throw createHttpError(400, "Crime type is required", {
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
  }

}

module.exports = EducationalController;

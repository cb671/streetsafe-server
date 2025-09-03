const db = require("../database/connect");
const Crime = require("./mapModel");

class EducationalResources {
  static async getAllResources() {
    try {
      const query = `
        SELECT id, title, url, description, type, target_crime_type, added_at
        FROM educational_sources
        ORDER BY added_at DESC
      `;
      const { rows } = await db.query(query);
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

 
  static async getResourcesByCrimeTypes(crimeTypes) {
    try {
      if (!crimeTypes || crimeTypes.length === 0) {
        return await this.getAllResources();
      }


      const placeholders = crimeTypes.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        SELECT id, title, url, description, type, target_crime_type, added_at
        FROM educational_sources
        WHERE EXISTS (
          SELECT 1 FROM unnest(string_to_array(target_crime_type, ', ')) AS crime_type
          WHERE crime_type = ANY(ARRAY[${placeholders}])
        )
        ORDER BY added_at DESC
      `;
      
      const { rows } = await db.query(query, crimeTypes);
      return rows;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }


  static async getUserTopCrimeTypes(userH3) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);


      let crimeData = await Crime.getCrimeDataBySpecificH3(userH3, startDate, endDate);
      
      if (!crimeData) {
        console.log('No crime data found for exact H3, trying parent cells...');
        try {
          const widerAreaQuery = `
            SELECT
              SUM(burglary) AS burglary,
              SUM(personal_theft) AS personal_theft,
              SUM(weapon_crime) AS weapon_crime,
              SUM(bicycle_theft) AS bicycle_theft,
              SUM(damage) AS damage,
              SUM(robbery) AS robbery,
              SUM(shoplifting) AS shoplifting,
              SUM(violent) AS violent,
              SUM(anti_social) AS anti_social,
              SUM(drugs) AS drugs,
              SUM(vehicle_crime) AS vehicle_crime
            FROM (
              SELECT *, h3_cell_to_parent(h3::h3index, 8) AS h3_wider
              FROM crime_areas
            ) sub
            WHERE h3_wider = h3_cell_to_parent($1::bigint::h3index, 8) 
            AND date >= $2 AND date <= $3;
          `;
          
          const db = require("../database/connect");
          const { rows } = await db.query(widerAreaQuery, [
            userH3, 
            startDate.toUTCString(), 
            endDate.toUTCString()
          ]);
          
          crimeData = rows[0] || null;
          console.log('Wider area search result:', crimeData);
          
        } catch (widerError) {
          console.error('Error searching wider area:', widerError);
        }
      }
      
      if (!crimeData) {
        console.log('No crime data found for user area or wider region');
        return [];
      }

      const crimeTypes = [
        ['burglary', parseInt(crimeData.burglary) || 0],
        ['personal_theft', parseInt(crimeData.personal_theft) || 0],
        ['weapon_crime', parseInt(crimeData.weapon_crime) || 0],
        ['bicycle_theft', parseInt(crimeData.bicycle_theft) || 0],
        ['damage', parseInt(crimeData.damage) || 0],
        ['robbery', parseInt(crimeData.robbery) || 0],
        ['shoplifting', parseInt(crimeData.shoplifting) || 0],
        ['violent', parseInt(crimeData.violent) || 0],
        ['anti_social', parseInt(crimeData.anti_social) || 0],
        ['drugs', parseInt(crimeData.drugs) || 0],
        ['vehicle_crime', parseInt(crimeData.vehicle_crime) || 0]
      ];

      const topCrimes = crimeTypes
        .filter(([_, count]) => count > 0)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 5) 
        .map(([type, _]) => type);

      console.log('Final top crimes:', topCrimes);
      return topCrimes;
    } catch (error) {
      console.error('Error getting user top crime types:', error);
      return [];
    }
  }


  static async getTailoredResources(userH3) {
    try {
      const topCrimeTypes = await this.getUserTopCrimeTypes(userH3);
      
      if (topCrimeTypes.length === 0) {
        return await this.getAllResources();
      }

      const tailoredResources = await this.getResourcesByCrimeTypes(topCrimeTypes);
      
      
      return tailoredResources.map(resource => ({
        ...resource,
        relevance_score: this.calculateRelevanceScore(resource.target_crime_type, topCrimeTypes),
        top_local_crimes: topCrimeTypes
      }));
      
    } catch (error) {
      throw new Error(`Error getting tailored resources: ${error.message}`);
    }
  }

  
  static calculateRelevanceScore(resourceCrimeTypes, userTopCrimes) {
    const resourceTypes = resourceCrimeTypes.split(', ').map(type => type.trim());
    let score = 0;
    
    resourceTypes.forEach(type => {
      const index = userTopCrimes.indexOf(type);
      if (index !== -1) {
        score += (userTopCrimes.length - index) * 2;
      }
    });
    
    return score;
  }
}

module.exports = EducationalResources;
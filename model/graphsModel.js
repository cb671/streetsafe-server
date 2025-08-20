const db = require("../database/connect");

class GraphsModel {
  // Convert natural language location to H3 index using geocoding
  static async locationToH3(locationString) {
    try {
      console.log('locationToH3 called with:', locationString);
      if (!locationString) {
        console.log('No location string provided, returning null');
        return null;
      }
      
      console.log('Making geocoding request to Nominatim...');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationString)}&limit=1`,
        {
          headers: {
            'User-Agent': 'StreetSafe-App/1.0'
          }
        }
      );
      
      if (!response.ok) {
        console.log('Geocoding response not ok:', response.status);
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      console.log('Geocoding response:', data);
      
      if (data.length === 0) {
        console.log('No geocoding results found');
        throw new Error(`Location "${locationString}" not found`);
      }
      
      const { lat, lon } = data[0];
      console.log('Coordinates found:', { lat, lon });
      
      const resolutionQuery = `SELECT h3_get_resolution(h3::h3index) as resolution FROM crime_areas LIMIT 1`;
      const { rows: resRows } = await db.query(resolutionQuery);
      const dataResolution = resRows[0]?.resolution || 9;
      console.log('Database H3 resolution:', dataResolution);
      
      
      const query = `SELECT h3_lat_lng_to_cell(POINT($1, $2), $3) as h3_index`;
      console.log('H3 conversion query:', query, 'with values:', [parseFloat(lon), parseFloat(lat), dataResolution]);
      
      const { rows } = await db.query(query, [parseFloat(lon), parseFloat(lat), dataResolution]);
      console.log('H3 conversion result:', rows);
      
      return rows[0].h3_index;
      
    } catch (error) {
      console.error('locationToH3 error:', error);
      throw new Error(`Error converting location to H3: ${error.message}`);
    }
  }

  // Convert km radius to H3 grid distance
  static async kmToH3GridDistance(radiusKm, centerH3) {
    try {
      console.log('kmToH3GridDistance called with:', { radiusKm, centerH3 });
      if (!radiusKm || !centerH3) {
        console.log('Missing parameters, returning default of 3');
        return 3; 
      }
      
     
      const radius = parseFloat(radiusKm);
      if (isNaN(radius) || radius <= 0) {
        console.log('Invalid radius, returning default of 3');
        return 3;
      }
      
      
      const query = `SELECT h3_cell_area($1::h3index, 'km^2') as cell_area_km2`;
      console.log('Cell area query:', query, 'with H3:', centerH3);
      
      const { rows } = await db.query(query, [centerH3]);
      console.log('Cell area result:', rows);
      
      if (rows.length === 0 || !rows[0].cell_area_km2) {
        console.log('Could not get cell area, returning default of 3');
        return 3;
      }
      
      const cellAreaKm2 = parseFloat(rows[0].cell_area_km2);
      
      
      const cellRadiusKm = Math.sqrt(cellAreaKm2 / (3 * Math.sqrt(3) / 2));
      
      
      const gridDistance = Math.ceil(radius / cellRadiusKm);
      
      
      const finalDistance = Math.min(gridDistance, 50);
      
      console.log('Distance calculation:', { 
        cellAreaKm2, 
        cellRadiusKm, 
        requestedRadius: radius,
        gridDistance, 
        finalDistance 
      });
      
      return finalDistance;
      
    } catch (error) {
      console.error('kmToH3GridDistance error:', error);
      return 3; 
    }
  }

  // Helper method to build WHERE clause for location filtering
  static buildLocationFilter(h3Index, gridDistance) {
    console.log('buildLocationFilter called with:', { h3Index, gridDistance });
    if (!h3Index) {
      console.log('No H3 index, returning empty filter');
      return '';
    }
    const filter = `AND h3_grid_distance(h3::h3index, '${h3Index}'::h3index) <= ${gridDistance}`;
    console.log('Location filter built:', filter);
    return filter;
  }

  // Helper method to filter crime data by specified types
  static filterCrimeTypes(row, crimeTypes) {
    console.log('filterCrimeTypes called with crimeTypes:', crimeTypes);
    if (!crimeTypes) {
      console.log('No crime types filter, returning original row');
      return row;
    }
    
    const types = Array.isArray(crimeTypes) ? crimeTypes : crimeTypes.split(',');
    console.log('Crime types to filter:', types);
    
    const crimeColumns = [
      'burglary', 'personal_theft', 'weapon_crime', 'bicycle_theft',
      'damage', 'robbery', 'shoplifting', 'violent', 'anti_social',
      'drugs', 'vehicle_crime'
    ];

    const filteredRow = { ...row };
    crimeColumns.forEach(column => {
      if (!types.includes(column)) {
        filteredRow[column] = 0;
      }
    });

    console.log('Filtered row result:', filteredRow);
    return filteredRow;
  }

  // Bar chart data - total crimes per category
  static async getCrimeTotalsByCategory(startDate, endDate, location, radiusKm, crimeTypes) {
    try {
      console.log('getCrimeTotalsByCategory called with:', { startDate, endDate, location, radiusKm, crimeTypes });
      
      const endDateValue = endDate || new Date().toISOString().split('T')[0];
      console.log('Date range:', { startDate, endDateValue });
      
      let locationFilter = '';
      if (location) {
        console.log('Processing location filter...');
        try {
          const h3Index = await this.locationToH3(location);
          console.log('Got H3 index:', h3Index);
          
          const gridDistance = await this.kmToH3GridDistance(radiusKm, h3Index);
          console.log('Got grid distance:', gridDistance);
          
          locationFilter = this.buildLocationFilter(h3Index, gridDistance);
          console.log('Location filter created:', locationFilter);
        } catch (locationError) {
          console.error('Location processing failed:', locationError);
          locationFilter = '';
        }
      } else {
        console.log('No location provided, skipping location filter');
      }
      
      const query = `
        SELECT
          COALESCE(SUM(burglary), 0) AS burglary,
          COALESCE(SUM(personal_theft), 0) AS personal_theft,
          COALESCE(SUM(weapon_crime), 0) AS weapon_crime,
          COALESCE(SUM(bicycle_theft), 0) AS bicycle_theft,
          COALESCE(SUM(damage), 0) AS damage,
          COALESCE(SUM(robbery), 0) AS robbery,
          COALESCE(SUM(shoplifting), 0) AS shoplifting,
          COALESCE(SUM(violent), 0) AS violent,
          COALESCE(SUM(anti_social), 0) AS anti_social,
          COALESCE(SUM(drugs), 0) AS drugs,
          COALESCE(SUM(vehicle_crime), 0) AS vehicle_crime
        FROM crime_areas
        WHERE date >= $1 AND date <= $2 ${locationFilter}
      `;
      
      console.log('Final query:', query);
      console.log('Query values:', [startDate, endDateValue]);
      
      const { rows } = await db.query(query, [startDate, endDateValue]);
      console.log('Query executed successfully, rows:', rows);
      
      if (rows.length === 0) {
        console.log('No data found, returning empty array');
        return [];
      }
      
      console.log('Applying crime type filter...');
      const filteredRow = this.filterCrimeTypes(rows[0], crimeTypes);
      
      
      const result = [
        { category: 'Burglary', count: parseInt(filteredRow.burglary) || 0 },
        { category: 'Personal Theft', count: parseInt(filteredRow.personal_theft) || 0 },
        { category: 'Weapon Crime', count: parseInt(filteredRow.weapon_crime) || 0 },
        { category: 'Bicycle Theft', count: parseInt(filteredRow.bicycle_theft) || 0 },
        { category: 'Damage', count: parseInt(filteredRow.damage) || 0 },
        { category: 'Robbery', count: parseInt(filteredRow.robbery) || 0 },
        { category: 'Shoplifting', count: parseInt(filteredRow.shoplifting) || 0 },
        { category: 'Violent Crime', count: parseInt(filteredRow.violent) || 0 },
        { category: 'Anti-Social', count: parseInt(filteredRow.anti_social) || 0 },
        { category: 'Drugs', count: parseInt(filteredRow.drugs) || 0 },
        { category: 'Vehicle Crime', count: parseInt(filteredRow.vehicle_crime) || 0 }
      ].filter(item => item.count > 0);
      
      console.log('Final result:', result);
      return result;
      
    } catch (error) {
      console.error('getCrimeTotalsByCategory error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw new Error(`Database error: ${error.message} (code: ${error.code})`);
    }
  }

  // Line chart data - crime trends over time
  static async getCrimeTrends(startDate, endDate, location, radiusKm, crimeTypes, groupBy) {
    try {
      console.log('getCrimeTrends called with:', { startDate, endDate, location, radiusKm, crimeTypes, groupBy });
      
      const endDateValue = endDate || new Date().toISOString().split('T')[0];
      
      let locationFilter = '';
      if (location) {
        try {
          const h3Index = await this.locationToH3(location);
          const gridDistance = await this.kmToH3GridDistance(radiusKm, h3Index);
          locationFilter = this.buildLocationFilter(h3Index, gridDistance);
        } catch (locationError) {
          console.error('Location processing failed in trends:', locationError);
          locationFilter = '';
        }
      }
      
     
      let dateGroup;
      switch (groupBy) {
        case 'year':
          dateGroup = "DATE_TRUNC('year', date)";
          break;
        default: 
          dateGroup = "date";
      }
      
      const query = `
        SELECT
          ${dateGroup} as period,
          COALESCE(SUM(burglary + personal_theft + weapon_crime + bicycle_theft + 
              damage + robbery + shoplifting + violent + anti_social + 
              drugs + vehicle_crime), 0) AS total_crimes,
          COALESCE(SUM(burglary), 0) AS burglary,
          COALESCE(SUM(personal_theft), 0) AS personal_theft,
          COALESCE(SUM(weapon_crime), 0) AS weapon_crime,
          COALESCE(SUM(bicycle_theft), 0) AS bicycle_theft,
          COALESCE(SUM(damage), 0) AS damage,
          COALESCE(SUM(robbery), 0) AS robbery,
          COALESCE(SUM(shoplifting), 0) AS shoplifting,
          COALESCE(SUM(violent), 0) AS violent,
          COALESCE(SUM(anti_social), 0) AS anti_social,
          COALESCE(SUM(drugs), 0) AS drugs,
          COALESCE(SUM(vehicle_crime), 0) AS vehicle_crime
        FROM crime_areas
        WHERE date >= $1 AND date <= $2 ${locationFilter}
        GROUP BY ${dateGroup}
        ORDER BY period
      `;
      
      console.log('Trends query:', query);
      console.log('Trends values:', [startDate, endDateValue]);
      
      const values = [startDate, endDateValue];
      const { rows } = await db.query(query, values);
      
      return rows.map(row => {
        const filteredRow = this.filterCrimeTypes(row, crimeTypes);
        return {
          period: row.period,
          total_crimes: parseInt(filteredRow.burglary || 0) + 
                       parseInt(filteredRow.personal_theft || 0) + 
                       parseInt(filteredRow.weapon_crime || 0) + 
                       parseInt(filteredRow.bicycle_theft || 0) + 
                       parseInt(filteredRow.damage || 0) + 
                       parseInt(filteredRow.robbery || 0) + 
                       parseInt(filteredRow.shoplifting || 0) + 
                       parseInt(filteredRow.violent || 0) + 
                       parseInt(filteredRow.anti_social || 0) + 
                       parseInt(filteredRow.drugs || 0) + 
                       parseInt(filteredRow.vehicle_crime || 0),
          ...filteredRow
        };
      });
      
    } catch (error) {
      console.error('getCrimeTrends error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Pie chart data - crime proportions
  static async getCrimeProportions(startDate, endDate, location, radiusKm, crimeTypes) {
    try {
      console.log('getCrimeProportions called');
      const totals = await this.getCrimeTotalsByCategory(startDate, endDate, location, radiusKm, crimeTypes);
      const totalCrimes = totals.reduce((sum, item) => sum + item.count, 0);
      
      if (totalCrimes === 0) return [];
      
      return totals.map(item => ({
        category: item.category,
        count: item.count,
        percentage: ((item.count / totalCrimes) * 100).toFixed(2)
      }));
      
    } catch (error) {
      console.error('getCrimeProportions error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Get available locations with actual location names
  static async getAvailableLocations() {
    try {
      console.log('getAvailableLocations called');
      const query = `
        SELECT DISTINCT h3_cell_to_parent(h3::h3index, 9) AS h3_low_res
        FROM crime_areas
        LIMIT 50
      `;
      
      console.log('Available locations query:', query);
      const { rows } = await db.query(query);
      console.log('Available locations raw result:', rows);
      
      
      return rows.map((row, index) => ({
        h3: row.h3_low_res,
        name: `Location ${index + 1}`
      }));
      
    } catch (error) {
      console.error('getAvailableLocations error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Get available date range from the database
  static async getDateRange() {
    try {
      console.log('getDateRange called');
      const query = `
        SELECT 
          MIN(date) as min_date,
          MAX(date) as max_date
        FROM crime_areas
      `;
      
      console.log('Date range query:', query);
      const { rows } = await db.query(query);
      console.log('Date range result:', rows);
      return rows[0];
      
    } catch (error) {
      console.error('getDateRange error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
  }
}

module.exports = GraphsModel;
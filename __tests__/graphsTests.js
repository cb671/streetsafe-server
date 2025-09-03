jest.mock('../database/connect', () => ({
  query: jest.fn()
}));

global.fetch = jest.fn();

const GraphsModel = require('../model/graphsModel');
const GraphsController = require('../controller/graphsController');
const db = require('../database/connect');

describe('Graphs Model and Controller', () => {
  let req, res;

  
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    
    req = {
      query: {},
      body: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('GraphsModel', () => {
    describe('locationToH3', () => {
      it('should return null if no location string provided', async () => {
        const result = await GraphsModel.locationToH3(null);
        expect(result).toBeNull();
      });

      it('should return null if empty location string provided', async () => {
        const result = await GraphsModel.locationToH3('');
        expect(result).toBeNull();
      });

      it('should convert location to H3 index successfully', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([{
            lat: '51.5074',
            lon: '-0.1278'
          }])
        });

        db.query.mockResolvedValueOnce({ rows: [{ resolution: 9 }] });
        db.query.mockResolvedValueOnce({ rows: [{ h3_index: '123456789' }] });

        const result = await GraphsModel.locationToH3('London');
        expect(result).toBe('123456789');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('nominatim.openstreetmap.org'),
          expect.any(Object)
        );
      });

      it('should throw error if geocoding service unavailable', async () => {
        global.fetch.mockResolvedValue({
          ok: false,
          status: 500
        });

        await expect(GraphsModel.locationToH3('London')).rejects.toThrow('Geocoding service unavailable');
      });

      it('should throw error if location not found', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([])
        });

        await expect(GraphsModel.locationToH3('InvalidLocation')).rejects.toThrow('Location "InvalidLocation" not found');
      });

      it('should handle database errors', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([{
            lat: '51.5074',
            lon: '-0.1278'
          }])
        });

        db.query.mockRejectedValue(new Error('DB error'));

        await expect(GraphsModel.locationToH3('London')).rejects.toThrow('Error converting location to H3: DB error');
      });

      it('should use default resolution if not found in database', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([{
            lat: '51.5074',
            lon: '-0.1278'
          }])
        });

        db.query.mockResolvedValueOnce({ rows: [] });
        db.query.mockResolvedValueOnce({ rows: [{ h3_index: '123456789' }] });

        const result = await GraphsModel.locationToH3('London');
        expect(result).toBe('123456789');
      });
    });

    describe('kmToH3GridDistance', () => {
      it('should return default distance if no radiusKm provided', async () => {
        const result = await GraphsModel.kmToH3GridDistance(null, '123456789');
        expect(result).toBe(3);
      });

      it('should return default distance if no centerH3 provided', async () => {
        const result = await GraphsModel.kmToH3GridDistance(5, null);
        expect(result).toBe(3);
      });

      it('should return default distance for invalid radius', async () => {
        const result = await GraphsModel.kmToH3GridDistance('invalid', '123456789');
        expect(result).toBe(3);
      });

      it('should return default distance for zero radius', async () => {
        const result = await GraphsModel.kmToH3GridDistance(0, '123456789');
        expect(result).toBe(3);
      });

      it('should calculate grid distance successfully', async () => {
        db.query.mockResolvedValue({
          rows: [{ cell_area_km2: 10.5 }]
        });

        const result = await GraphsModel.kmToH3GridDistance(5, '123456789');
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(50);
      });

      it('should return default distance if no cell area found', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const result = await GraphsModel.kmToH3GridDistance(5, '123456789');
        expect(result).toBe(3);
      });

      it('should return default distance if cell_area_km2 is null', async () => {
        db.query.mockResolvedValue({
          rows: [{ cell_area_km2: null }]
        });

        const result = await GraphsModel.kmToH3GridDistance(5, '123456789');
        expect(result).toBe(3);
      });

      it('should limit grid distance to maximum of 50', async () => {
        db.query.mockResolvedValue({
          rows: [{ cell_area_km2: 0.001 }]
        });

        const result = await GraphsModel.kmToH3GridDistance(1000, '123456789');
        expect(result).toBe(50);
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('DB error'));

        const result = await GraphsModel.kmToH3GridDistance(5, '123456789');
        expect(result).toBe(3);
      });
    });

    describe('buildLocationFilter', () => {
      it('should return empty string if no H3 index provided', () => {
        const result = GraphsModel.buildLocationFilter(null, 5);
        expect(result).toBe('');
      });

      it('should build location filter correctly', () => {
        const result = GraphsModel.buildLocationFilter('123456789', 5);
        expect(result).toBe("AND h3_grid_distance(h3::h3index, '123456789'::h3index) <= 5");
      });
    });

    describe('filterCrimeTypes', () => {
      const mockRow = {
        burglary: '10',
        personal_theft: '5',
        weapon_crime: '2',
        bicycle_theft: '3',
        damage: '7',
        robbery: '1',
        shoplifting: '4',
        violent: '8',
        anti_social: '6',
        drugs: '2',
        vehicle_crime: '5'
      };

      it('should return original row if no crime types filter', () => {
        const result = GraphsModel.filterCrimeTypes(mockRow, null);
        expect(result).toEqual(mockRow);
      });

      it('should filter crime types from array', () => {
        const result = GraphsModel.filterCrimeTypes(mockRow, ['burglary', 'drugs']);
        expect(result.burglary).toBe('10');
        expect(result.drugs).toBe('2');
        expect(result.personal_theft).toBe(0);
        expect(result.violent).toBe(0);
      });

      it('should filter crime types from comma-separated string', () => {
        const result = GraphsModel.filterCrimeTypes(mockRow, 'burglary,violent');
        expect(result.burglary).toBe('10');
        expect(result.violent).toBe('8');
        expect(result.personal_theft).toBe(0);
        expect(result.drugs).toBe(0);
      });
    });

    describe('getCrimeTotalsByCategory', () => {
      it('should get crime totals without location filter', async () => {
        const mockData = {
          burglary: '10',
          personal_theft: '5',
          weapon_crime: '2',
          bicycle_theft: '3',
          damage: '7',
          robbery: '1',
          shoplifting: '4',
          violent: '8',
          anti_social: '6',
          drugs: '2',
          vehicle_crime: '5'
        };

        db.query.mockResolvedValue({ rows: [mockData] });

        const result = await GraphsModel.getCrimeTotalsByCategory('2023-01-01', '2023-12-31', null, 3, null);
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
        expect(result.find(item => item.category === 'Burglary').count).toBe(10);
      });

      it('should use current date as endDate if not provided', async () => {
        db.query.mockResolvedValue({ rows: [{}] });

        await GraphsModel.getCrimeTotalsByCategory('2023-01-01', null, null, 3, null);
        expect(db.query).toHaveBeenCalled();
      });

      it('should return empty array if no data found', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const result = await GraphsModel.getCrimeTotalsByCategory('2023-01-01', '2023-12-31', null, 3, null);
        expect(result).toEqual([]);
      });

      it('should handle location processing errors gracefully', async () => {
        const spy = jest.spyOn(GraphsModel, 'locationToH3').mockRejectedValue(new Error('Location error'));
        
        db.query.mockResolvedValue({ rows: [{}] });

        const result = await GraphsModel.getCrimeTotalsByCategory('2023-01-01', '2023-12-31', 'InvalidLocation', 3, null);
        expect(result).toBeInstanceOf(Array);
        
        spy.mockRestore();
      });

      it('should filter out categories with zero counts', async () => {
        const mockData = {
          burglary: '10',
          personal_theft: '0',
          weapon_crime: '2',
          bicycle_theft: '0',
          damage: '0',
          robbery: '0',
          shoplifting: '0',
          violent: '0',
          anti_social: '0',
          drugs: '0',
          vehicle_crime: '0'
        };

        db.query.mockResolvedValue({ rows: [mockData] });

        const result = await GraphsModel.getCrimeTotalsByCategory('2023-01-01', '2023-12-31', null, 3, null);
        expect(result.length).toBe(2); 
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('DB connection failed'));

        await expect(GraphsModel.getCrimeTotalsByCategory('2023-01-01', '2023-12-31', null, 3, null))
          .rejects.toThrow('Database error: DB connection failed');
      });
    });

    describe('getCrimeTrends', () => {
      it('should get crime trends with default grouping', async () => {
        const mockData = [
          { period: '2023-01-01', burglary: '5', personal_theft: '3' },
          { period: '2023-02-01', burglary: '7', personal_theft: '2' }
        ];

        db.query.mockResolvedValue({ rows: mockData });

        const result = await GraphsModel.getCrimeTrends('2023-01-01', '2023-12-31', null, 3, null, 'month');
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(2);
        expect(result[0]).toHaveProperty('total_crimes');
      });

      it('should group by year when specified', async () => {
        db.query.mockResolvedValue({ rows: [] });

        await GraphsModel.getCrimeTrends('2023-01-01', '2023-12-31', null, 3, null, 'year');
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining("DATE_TRUNC('year', date)"),
          expect.any(Array)
        );
      });

      it('should handle location processing errors in trends', async () => {
        const spy = jest.spyOn(GraphsModel, 'locationToH3').mockRejectedValue(new Error('Location error'));
        
        db.query.mockResolvedValue({ rows: [] });

        const result = await GraphsModel.getCrimeTrends('2023-01-01', '2023-12-31', 'InvalidLocation', 3, null, 'month');
        expect(result).toBeInstanceOf(Array);
        
        spy.mockRestore();
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('DB error'));

        await expect(GraphsModel.getCrimeTrends('2023-01-01', '2023-12-31', null, 3, null, 'month'))
          .rejects.toThrow('Database error: DB error');
      });
    });

    describe('getCrimeProportions', () => {
      it('should get crime proportions successfully', async () => {
        const spy = jest.spyOn(GraphsModel, 'getCrimeTotalsByCategory').mockResolvedValue([
          { category: 'Burglary', count: 10 },
          { category: 'Violent Crime', count: 5 }
        ]);

        const result = await GraphsModel.getCrimeProportions('2023-01-01', '2023-12-31', null, 3, null);
        expect(result).toBeInstanceOf(Array);
        expect(result[0]).toHaveProperty('percentage');
        expect(result[0].percentage).toBe('66.67');
        
        spy.mockRestore();
      });

      it('should return empty array if no crimes', async () => {
        const spy = jest.spyOn(GraphsModel, 'getCrimeTotalsByCategory').mockResolvedValue([]);

        const result = await GraphsModel.getCrimeProportions('2023-01-01', '2023-12-31', null, 3, null);
        expect(result).toEqual([]);
        
        spy.mockRestore();
      });

      it('should handle errors from getCrimeTotalsByCategory', async () => {
        const spy = jest.spyOn(GraphsModel, 'getCrimeTotalsByCategory').mockRejectedValue(new Error('Totals error'));

        await expect(GraphsModel.getCrimeProportions('2023-01-01', '2023-12-31', null, 3, null))
          .rejects.toThrow('Database error: Totals error');
        
        spy.mockRestore();
      });
    });

    describe('getAvailableLocations', () => {
      it('should get available locations successfully', async () => {
        const mockRows = [
          { h3_low_res: '123456789' },
          { h3_low_res: '987654321' }
        ];

        db.query.mockResolvedValue({ rows: mockRows });

        const result = await GraphsModel.getAvailableLocations();
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(2);
        expect(result[0]).toHaveProperty('h3');
        expect(result[0]).toHaveProperty('name');
        expect(result[0].name).toBe('Location 1');
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('DB error'));

        await expect(GraphsModel.getAvailableLocations())
          .rejects.toThrow('Database error: DB error');
      });
    });

    describe('getDateRange', () => {
      it('should get date range successfully', async () => {
        const mockRow = {
          min_date: '2020-01-01',
          max_date: '2023-12-31'
        };

        db.query.mockResolvedValue({ rows: [mockRow] });

        const result = await GraphsModel.getDateRange();
        expect(result).toEqual(mockRow);
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('DB error'));

        await expect(GraphsModel.getDateRange())
          .rejects.toThrow('Database error: DB error');
      });
    });
  });

  describe('GraphsController', () => {
    describe('getCrimeTotals', () => {
      it('should get crime totals with default parameters', async () => {
        const spy = jest.spyOn(GraphsModel, 'getCrimeTotalsByCategory').mockResolvedValue([
          { category: 'Burglary', count: 10 }
        ]);

        await GraphsController.getCrimeTotals(req, res);
        
        expect(spy).toHaveBeenCalledWith('2020-01-01', undefined, undefined, 3, undefined);
        expect(res.json).toHaveBeenCalledWith([{ category: 'Burglary', count: 10 }]);
        
        spy.mockRestore();
      });

      it('should get crime totals with custom parameters', async () => {
        req.query = {
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          location: 'London',
          radius: '5',
          crimeTypes: 'burglary,violent'
        };

        const spy = jest.spyOn(GraphsModel, 'getCrimeTotalsByCategory').mockResolvedValue([]);

        await GraphsController.getCrimeTotals(req, res);
        
        expect(spy).toHaveBeenCalledWith('2023-01-01', '2023-12-31', 'London', '5', 'burglary,violent');
        
        spy.mockRestore();
      });

      it('should handle errors and return 500', async () => {
        const spy = jest.spyOn(GraphsModel, 'getCrimeTotalsByCategory').mockRejectedValue(new Error('Model error'));

        await GraphsController.getCrimeTotals(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Internal server error",
          message: "Model error"
        });
        
        spy.mockRestore();
      });
    });

    describe('getCrimeTrends', () => {
      it('should get crime trends with default parameters', async () => {
        const spy = jest.spyOn(GraphsModel, 'getCrimeTrends').mockResolvedValue([]);

        await GraphsController.getCrimeTrends(req, res);
        
        expect(spy).toHaveBeenCalledWith('2020-01-01', undefined, undefined, 3, undefined, 'month');
        expect(res.json).toHaveBeenCalled();
        
        spy.mockRestore();
      });

      it('should get crime trends with custom groupBy', async () => {
        req.query = { groupBy: 'year' };
        const spy = jest.spyOn(GraphsModel, 'getCrimeTrends').mockResolvedValue([]);

        await GraphsController.getCrimeTrends(req, res);
        
        expect(spy).toHaveBeenCalledWith('2020-01-01', undefined, undefined, 3, undefined, 'year');
        
        spy.mockRestore();
      });

      it('should handle errors and return 500', async () => {
        const spy = jest.spyOn(GraphsModel, 'getCrimeTrends').mockRejectedValue(new Error('Trends error'));

        await GraphsController.getCrimeTrends(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Internal server error",
          message: "Trends error"
        });
        
        spy.mockRestore();
      });
    });

    describe('getCrimeProportions', () => {
      it('should get crime proportions successfully', async () => {
        const spy = jest.spyOn(GraphsModel, 'getCrimeProportions').mockResolvedValue([]);

        await GraphsController.getCrimeProportions(req, res);
        
        expect(spy).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
        
        spy.mockRestore();
      });

      it('should handle errors and return 500', async () => {
        const spy = jest.spyOn(GraphsModel, 'getCrimeProportions').mockRejectedValue(new Error('Proportions error'));

        await GraphsController.getCrimeProportions(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        
        spy.mockRestore();
      });
    });

    describe('getAvailableLocations', () => {
      it('should get available locations successfully', async () => {
        const spy = jest.spyOn(GraphsModel, 'getAvailableLocations').mockResolvedValue([]);

        await GraphsController.getAvailableLocations(req, res);
        
        expect(spy).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
        
        spy.mockRestore();
      });

      it('should handle errors and return 500', async () => {
        const spy = jest.spyOn(GraphsModel, 'getAvailableLocations').mockRejectedValue(new Error('Locations error'));

        await GraphsController.getAvailableLocations(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        
        spy.mockRestore();
      });
    });

    describe('getDateRange', () => {
      it('should get date range successfully', async () => {
        const spy = jest.spyOn(GraphsModel, 'getDateRange').mockResolvedValue({});

        await GraphsController.getDateRange(req, res);
        
        expect(spy).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalled();
        
        spy.mockRestore();
      });

      it('should handle errors and return 500', async () => {
        const spy = jest.spyOn(GraphsModel, 'getDateRange').mockRejectedValue(new Error('Date range error'));

        await GraphsController.getDateRange(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        
        spy.mockRestore();
      });
    });

    describe('getCrimeTypes', () => {
      it('should return static crime types array', async () => {
        await GraphsController.getCrimeTypes(req, res);
        
        expect(res.json).toHaveBeenCalledWith([
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
        ]);
      });


    
      });
    });
  });
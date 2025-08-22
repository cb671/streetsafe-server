jest.mock('../database/connect', () => ({
  query: jest.fn()
}));

jest.mock('../model/emergServicesModel', () => ({
  findClosestService: jest.fn()
}));

global.fetch = jest.fn();

const Crime = require('../model/mapModel');
const MapController = require('../controller/mapController');
const EmergencyServices = require('../model/emergServicesModel');
const db = require('../database/connect');

describe('Map Model and Controller', () => {
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

    MapController.mapFeatureCache.clear();
    
    req = {
      query: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('Crime Model', () => {
    describe('getCrimeDataByH3', () => {
      it('should get crime data by H3 with date range', async () => {
        const mockRows = [
          {
            h3_low_res: '123456789',
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
          }
        ];

        db.query.mockResolvedValue({ rows: mockRows });

        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');
        
        const result = await Crime.getCrimeDataByH3(startDate, endDate);
        
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          [startDate.toUTCString(), endDate.toUTCString()]
        );
        expect(result).toEqual(mockRows);
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('DB connection failed'));

        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');

        await expect(Crime.getCrimeDataByH3(startDate, endDate))
          .rejects.toThrow('Database error: DB connection failed');
      });

      
    });

    describe('getCrimeDataBySpecificH3', () => {
      it('should get crime data for hex string H3 index', async () => {
        const mockRow = {
          h3_low_res: '8a1fb4665ffffff',
          burglary: '5',
          personal_theft: '3',
          weapon_crime: '1',
          bicycle_theft: '2',
          damage: '4',
          robbery: '0',
          shoplifting: '1',
          violent: '6',
          anti_social: '2',
          drugs: '1',
          vehicle_crime: '3'
        };

        db.query.mockResolvedValue({ rows: [mockRow] });

        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');
        
        const result = await Crime.getCrimeDataBySpecificH3('8a1fb4665ffffff', startDate, endDate);
        
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('$1::h3index'),
          ['8a1fb4665ffffff', startDate.toUTCString(), endDate.toUTCString()]
        );
        expect(result).toEqual(mockRow);
      });

      it('should get crime data for BIGINT H3 index', async () => {
        const mockRow = {
          h3_low_res: '123456789',
          burglary: '3',
          personal_theft: '2',
          weapon_crime: '0',
          bicycle_theft: '1',
          damage: '2',
          robbery: '0',
          shoplifting: '0',
          violent: '4',
          anti_social: '1',
          drugs: '0',
          vehicle_crime: '2'
        };

        db.query.mockResolvedValue({ rows: [mockRow] });

        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');
        
        const result = await Crime.getCrimeDataBySpecificH3('123456789', startDate, endDate);
        
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('$1::h3index'),
          ['123456789', startDate.toUTCString(), endDate.toUTCString()]
        );
        expect(result).toEqual(mockRow);
      });

      it('should return null if no data found', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');
        
        const result = await Crime.getCrimeDataBySpecificH3('123456789', startDate, endDate);
        expect(result).toBeNull();
      });

      it('should use current date if endDate is null', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const startDate = new Date('2023-01-01');
        
        const result = await Crime.getCrimeDataBySpecificH3('123456789', startDate, null);
        expect(result).toBeNull();
        expect(db.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining(['123456789', startDate.toUTCString(), expect.any(String)])
        );
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('Query failed'));

        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');

        await expect(Crime.getCrimeDataBySpecificH3('123456789', startDate, endDate))
          .rejects.toThrow('Database error: Query failed');
      });
    });

    describe('getLocationNameFromH3', () => {
      it('should get location name for hex string H3 index', async () => {
        db.query.mockResolvedValue({
          rows: [{ coords: { x: -0.1278, y: 51.5074 } }]
        });

        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            address: {
              neighbourhood: 'Westminster',
              city: 'London',
              county: 'Greater London'
            }
          })
        });

        const result = await Crime.getLocationNameFromH3('8a1fb4665ffffff');
        
        expect(db.query).toHaveBeenCalledWith(
          'SELECT h3_cell_to_lat_lng($1::h3index) as coords',
          ['8a1fb4665ffffff']
        );
        expect(result).toBe('Westminster, London, Greater London');
      });

      it('should get location name for BIGINT H3 index', async () => {
        db.query.mockResolvedValue({
          rows: [{ coords: { x: -0.1278, y: 51.5074 } }]
        });

        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            address: {
              city: 'London'
            }
          })
        });

        const result = await Crime.getLocationNameFromH3('123456789');
        
        expect(db.query).toHaveBeenCalledWith(
          'SELECT h3_cell_to_lat_lng($1::bigint::h3index) as coords',
          ['123456789']
        );
        expect(result).toBe('London');
      });

      it('should return "Unknown Location" if no coordinates found', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const result = await Crime.getLocationNameFromH3('123456789');
        expect(result).toBe('Unknown Location');
      });

      it('should return "Unknown Location" for invalid coordinates', async () => {
        db.query.mockResolvedValue({
          rows: [{ coords: { x: null, y: null } }]
        });

        const result = await Crime.getLocationNameFromH3('123456789');
        expect(result).toBe('Unknown Location');
      });

      it('should return "Unknown Location" for NaN coordinates', async () => {
        db.query.mockResolvedValue({
          rows: [{ coords: { x: NaN, y: NaN } }]
        });

        const result = await Crime.getLocationNameFromH3('123456789');
        expect(result).toBe('Unknown Location');
      });

      it('should return "Unknown Location" if geocoding API fails', async () => {
        db.query.mockResolvedValue({
          rows: [{ coords: { x: -0.1278, y: 51.5074 } }]
        });

        global.fetch.mockResolvedValue({
          ok: false,
          status: 500
        });

        const result = await Crime.getLocationNameFromH3('123456789');
        expect(result).toBe('Unknown Location');
      });

      it('should handle geocoding API errors', async () => {
        db.query.mockResolvedValue({
          rows: [{ coords: { x: -0.1278, y: 51.5074 } }]
        });

        global.fetch.mockRejectedValue(new Error('Network error'));

        const result = await Crime.getLocationNameFromH3('123456789');
        expect(result).toBe('Unknown Location');
      });

      it('should filter duplicate location parts', async () => {
        db.query.mockResolvedValue({
          rows: [{ coords: { x: -0.1278, y: 51.5074 } }]
        });

        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            address: {
              neighbourhood: 'London',
              city: 'London',
              county: 'Greater London'
            }
          })
        });

        const result = await Crime.getLocationNameFromH3('123456789');
        expect(result).toBe('London, Greater London');
      });

      it('should handle empty address from geocoding API', async () => {
        db.query.mockResolvedValue({
          rows: [{ coords: { x: -0.1278, y: 51.5074 } }]
        });

        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({})
        });

        const result = await Crime.getLocationNameFromH3('123456789');
        expect(result).toBe('Unknown Location');
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('DB error'));

        const result = await Crime.getLocationNameFromH3('123456789');
        expect(result).toBe('Unknown Location');
      });
    });

    describe('formatCrimeData', () => {
      it('should format raw crime data correctly', () => {
        const rawData = [
          {
            h3_low_res: '123456789',
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
          },
          {
            h3_low_res: '987654321',
            burglary: '8',
            personal_theft: '3',
            weapon_crime: '1',
            bicycle_theft: '2',
            damage: '5',
            robbery: '0',
            shoplifting: '2',
            violent: '6',
            anti_social: '4',
            drugs: '1',
            vehicle_crime: '3'
          }
        ];

        const result = Crime.formatCrimeData(rawData);
        
        expect(result).toEqual([
          ['123456789', 10, 5, 2, 3, 7, 1, 4, 8, 6, 2, 5],
          ['987654321', 8, 3, 1, 2, 5, 0, 2, 6, 4, 1, 3]
        ]);
      });

      it('should handle null/undefined values', () => {
        const rawData = [
          {
            h3_low_res: '123456789',
            burglary: null,
            personal_theft: undefined,
            weapon_crime: '',
            bicycle_theft: '3',
            damage: '7',
            robbery: '1',
            shoplifting: '4',
            violent: '8',
            anti_social: '6',
            drugs: '2',
            vehicle_crime: '5'
          }
        ];

        const result = Crime.formatCrimeData(rawData);
        
        expect(result[0]).toEqual(['123456789', 0, 0, 0, 3, 7, 1, 4, 8, 6, 2, 5]);
      });
    });

    describe('formatCrimeDataWithLocation', () => {
      it('should format crime data with location names', async () => {
        const rawData = [
          {
            h3_low_res: '123456789',
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
          }
        ];

        const spy = jest.spyOn(Crime, 'getLocationNameFromH3').mockResolvedValue('London');

        const result = await Crime.formatCrimeDataWithLocation(rawData);
        
        expect(spy).toHaveBeenCalledWith('123456789');
        expect(result).toEqual([
          {
            h3: '123456789',
            name: 'London',
            crimes: [10, 5, 2, 3, 7, 1, 4, 8, 6, 2, 5]
          }
        ]);

        spy.mockRestore();
      });

      it('should handle multiple locations', async () => {
        const rawData = [
          {
            h3_low_res: '123456789',
            burglary: '5',
            personal_theft: '3',
            weapon_crime: '1',
            bicycle_theft: '2',
            damage: '4',
            robbery: '0',
            shoplifting: '1',
            violent: '6',
            anti_social: '2',
            drugs: '1',
            vehicle_crime: '3'
          },
          {
            h3_low_res: '987654321',
            burglary: '8',
            personal_theft: '4',
            weapon_crime: '2',
            bicycle_theft: '1',
            damage: '3',
            robbery: '1',
            shoplifting: '2',
            violent: '5',
            anti_social: '3',
            drugs: '0',
            vehicle_crime: '2'
          }
        ];

        const spy = jest.spyOn(Crime, 'getLocationNameFromH3')
          .mockResolvedValueOnce('London')
          .mockResolvedValueOnce('Manchester');

        const result = await Crime.formatCrimeDataWithLocation(rawData);
        
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('London');
        expect(result[1].name).toBe('Manchester');

        spy.mockRestore();
      });
    });
  });

  describe('MapController', () => {
    describe('getMapFeatures', () => {
      it('should get map features with default dates', async () => {
        const mockRawData = [
          {
            h3_low_res: '123456789',
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
          }
        ];

        const getCrimeDataSpy = jest.spyOn(Crime, 'getCrimeDataByH3').mockResolvedValue(mockRawData);
        const formatDataSpy = jest.spyOn(Crime, 'formatCrimeData').mockReturnValue([
          ['123456789', 10, 5, 2, 3, 7, 1, 4, 8, 6, 2, 5]
        ]);

        await MapController.getMapFeatures(req, res);

        expect(getCrimeDataSpy).toHaveBeenCalled();
        expect(formatDataSpy).toHaveBeenCalledWith(mockRawData);
        expect(res.json).toHaveBeenCalledWith([
          ['123456789', 10, 5, 2, 3, 7, 1, 4, 8, 6, 2, 5]
        ]);

        getCrimeDataSpy.mockRestore();
        formatDataSpy.mockRestore();
      });

      it('should get map features with custom dates', async () => {
        req.query = {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        };

        const mockRawData = [];
        const getCrimeDataSpy = jest.spyOn(Crime, 'getCrimeDataByH3').mockResolvedValue(mockRawData);
        const formatDataSpy = jest.spyOn(Crime, 'formatCrimeData').mockReturnValue([]);

        await MapController.getMapFeatures(req, res);

        expect(getCrimeDataSpy).toHaveBeenCalledWith(
          expect.any(Date),
          expect.any(Date)
        );
        expect(res.json).toHaveBeenCalledWith([]);

        getCrimeDataSpy.mockRestore();
        formatDataSpy.mockRestore();
      });

      it('should return cached data if available', async () => {
        const cachedData = [['cached', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]];
        
        
        const getCrimeDataSpy = jest.spyOn(Crime, 'getCrimeDataByH3').mockResolvedValue([]);
        const formatDataSpy = jest.spyOn(Crime, 'formatCrimeData').mockReturnValue(cachedData);

        await MapController.getMapFeatures(req, res);

        getCrimeDataSpy.mockClear();
        formatDataSpy.mockClear();
        res.json.mockClear();

       
        await MapController.getMapFeatures(req, res);

        expect(getCrimeDataSpy).not.toHaveBeenCalled();
        expect(formatDataSpy).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(cachedData);

        getCrimeDataSpy.mockRestore();
        formatDataSpy.mockRestore();
      });

      it('should handle errors and return 500', async () => {
        const getCrimeDataSpy = jest.spyOn(Crime, 'getCrimeDataByH3').mockRejectedValue(new Error('Database error'));

        await MapController.getMapFeatures(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Internal server error",
          message: "Database error"
        });

        getCrimeDataSpy.mockRestore();
      });
    });

    describe('getSpecificHexagonData', () => {
      it('should get specific hexagon data successfully', async () => {
        req.params = { h3Index: '123456789' };
        req.query = {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        };

        const mockCrimeData = {
          h3_low_res: '123456789',
          burglary: '5',
          personal_theft: '3',
          weapon_crime: '1',
          bicycle_theft: '2',
          damage: '4',
          robbery: '0',
          shoplifting: '1',
          violent: '6',
          anti_social: '2',
          drugs: '1',
          vehicle_crime: '3'
        };

        const mockFormattedData = [{
          h3: '123456789',
          name: 'London',
          crimes: [5, 3, 1, 2, 4, 0, 1, 6, 2, 1, 3]
        }];

        const mockEmergencyServices = {
          police: { name: 'Metropolitan Police', type: 'police', h3: '123456789' },
          hospital: { name: 'London Hospital', type: 'NHS Hospital', h3: '987654321' }
        };

        const getCrimeSpy = jest.spyOn(Crime, 'getCrimeDataBySpecificH3').mockResolvedValue(mockCrimeData);
        const formatSpy = jest.spyOn(Crime, 'formatCrimeDataWithLocation').mockResolvedValue(mockFormattedData);
        EmergencyServices.findClosestService.mockResolvedValue(mockEmergencyServices);

        await MapController.getSpecificHexagonData(req, res);

        expect(getCrimeSpy).toHaveBeenCalledWith('123456789', expect.any(Date), expect.any(Date));
        expect(formatSpy).toHaveBeenCalledWith([mockCrimeData]);
        expect(EmergencyServices.findClosestService).toHaveBeenCalledWith('123456789');
        expect(res.json).toHaveBeenCalledWith({
          ...mockFormattedData[0],
          emergencyServices: mockEmergencyServices
        });

        getCrimeSpy.mockRestore();
        formatSpy.mockRestore();
      });

      it('should return 400 if h3Index is missing', async () => {
        req.params = {};

        await MapController.getSpecificHexagonData(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Bad request",
          message: "H3 index is required"
        });
      });

      it('should return 404 if no data found', async () => {
        req.params = { h3Index: '123456789' };

        const getCrimeSpy = jest.spyOn(Crime, 'getCrimeDataBySpecificH3').mockResolvedValue(null);

        await MapController.getSpecificHexagonData(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          error: "Not found",
          message: "No data found for the specified H3 index"
        });

        getCrimeSpy.mockRestore();
      });

      it('should use default dates if not provided', async () => {
        req.params = { h3Index: '123456789' };

        const getCrimeSpy = jest.spyOn(Crime, 'getCrimeDataBySpecificH3').mockResolvedValue(null);

        await MapController.getSpecificHexagonData(req, res);

        expect(getCrimeSpy).toHaveBeenCalledWith('123456789', expect.any(Date), expect.any(Date));

        getCrimeSpy.mockRestore();
      });

      it('should handle errors and return 500', async () => {
        req.params = { h3Index: '123456789' };

        const getCrimeSpy = jest.spyOn(Crime, 'getCrimeDataBySpecificH3').mockRejectedValue(new Error('Database error'));

        await MapController.getSpecificHexagonData(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Internal server error",
          message: "Database error"
        });

        getCrimeSpy.mockRestore();
      });
    });
  });
});
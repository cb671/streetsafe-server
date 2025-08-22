jest.mock('../database/connect', () => ({
  query: jest.fn()
}));

jest.mock('../model/mapModel', () => ({
  getCrimeDataBySpecificH3: jest.fn(),
  getLocationNameFromH3: jest.fn()
}));

jest.mock('../model/userModel', () => ({
  findById: jest.fn()
}));

const EducationalModel = require('../model/educationalModel');
const EducationalController = require('../controller/educationalController');
const db = require('../database/connect');
const Crime = require('../model/mapModel');
const User = require('../model/userModel');

describe('Educational Model and Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { userId: null, body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };
  });

  describe('EducationalModel', () => {
    describe('getAllResources', () => {
      it('should return all resources', async () => {
        db.query.mockResolvedValue({ rows: [{ id: 1, title: 'Resource' }] });
        const result = await EducationalModel.getAllResources();
        expect(db.query).toHaveBeenCalled();
        expect(result).toEqual([{ id: 1, title: 'Resource' }]);
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('DB error'));
        await expect(EducationalModel.getAllResources()).rejects.toThrow('Database error: DB error');
      });
    });

    describe('getResourcesByCrimeTypes', () => {
      it('should return all resources if crimeTypes is empty', async () => {
        const spy = jest.spyOn(EducationalModel, 'getAllResources').mockResolvedValue([{ id: 1 }]);
        const result = await EducationalModel.getResourcesByCrimeTypes([]);
        expect(spy).toHaveBeenCalled();
        expect(result).toEqual([{ id: 1 }]);
        spy.mockRestore();
      });

      it('should return all resources if crimeTypes is null', async () => {
        const spy = jest.spyOn(EducationalModel, 'getAllResources').mockResolvedValue([{ id: 1 }]);
        const result = await EducationalModel.getResourcesByCrimeTypes(null);
        expect(spy).toHaveBeenCalled();
        expect(result).toEqual([{ id: 1 }]);
        spy.mockRestore();
      });

      it('should return filtered resources for crime types', async () => {
        db.query.mockResolvedValue({ rows: [{ id: 2, title: 'Burglary Resource' }] });
        const result = await EducationalModel.getResourcesByCrimeTypes(['burglary']);
        expect(db.query).toHaveBeenCalled();
        expect(result).toEqual([{ id: 2, title: 'Burglary Resource' }]);
      });

      it('should handle database errors', async () => {
        db.query.mockRejectedValue(new Error('DB error'));
        await expect(EducationalModel.getResourcesByCrimeTypes(['burglary'])).rejects.toThrow('Database error: DB error');
      });
    });

    describe('getUserTopCrimeTypes', () => {
      it('should return top crime types from crime data', async () => {
        const mockCrimeData = {
          burglary: '5',
          personal_theft: '3',
          weapon_crime: '0',
          bicycle_theft: '2',
          damage: '1',
          robbery: '0',
          shoplifting: '0',
          violent: '4',
          anti_social: '1',
          drugs: '0',
          vehicle_crime: '2'
        };
        Crime.getCrimeDataBySpecificH3.mockResolvedValue(mockCrimeData);
        
        const result = await EducationalModel.getUserTopCrimeTypes('123456789');
        expect(result).toEqual(['burglary', 'violent', 'personal_theft', 'bicycle_theft', 'vehicle_crime']);
      });

      it('should try wider area if no specific H3 data', async () => {
        Crime.getCrimeDataBySpecificH3.mockResolvedValueOnce(null);
        db.query.mockResolvedValue({ 
          rows: [{ 
            burglary: '3', 
            personal_theft: '2',
            weapon_crime: '0',
            bicycle_theft: '0',
            damage: '0',
            robbery: '0',
            shoplifting: '0',
            violent: '1',
            anti_social: '0',
            drugs: '0',
            vehicle_crime: '0'
          }] 
        });
        
        const result = await EducationalModel.getUserTopCrimeTypes('123456789');
        expect(result).toContain('burglary');
        expect(result).toContain('personal_theft');
      });

      it('should return empty array if no crime data found', async () => {
        Crime.getCrimeDataBySpecificH3.mockResolvedValueOnce(null);
        db.query.mockResolvedValue({ rows: [] });
        
        const result = await EducationalModel.getUserTopCrimeTypes('123456789');
        expect(result).toEqual([]);
      });

      it('should handle errors and return empty array', async () => {
        Crime.getCrimeDataBySpecificH3.mockRejectedValue(new Error('DB error'));
        const result = await EducationalModel.getUserTopCrimeTypes('123456789');
        expect(result).toEqual([]);
      });

      it('should handle wider area query errors', async () => {
        Crime.getCrimeDataBySpecificH3.mockResolvedValueOnce(null);
        db.query.mockRejectedValue(new Error('Wider area error'));
        
        const result = await EducationalModel.getUserTopCrimeTypes('123456789');
        expect(result).toEqual([]);
      });
    });

    describe('getTailoredResources', () => {
      it('should return tailored resources with relevance scores', async () => {
        const spy = jest.spyOn(EducationalModel, 'getUserTopCrimeTypes').mockResolvedValue(['burglary', 'drugs']);
        const resourcesSpy = jest.spyOn(EducationalModel, 'getResourcesByCrimeTypes').mockResolvedValue([
          { id: 1, title: 'Resource', target_crime_type: 'burglary, drugs' }
        ]);
        
        const result = await EducationalModel.getTailoredResources('123456789');
        expect(result[0]).toHaveProperty('relevance_score');
        expect(result[0]).toHaveProperty('top_local_crimes');
        
        spy.mockRestore();
        resourcesSpy.mockRestore();
      });

      it('should return all resources if no top crimes', async () => {
        const spy = jest.spyOn(EducationalModel, 'getUserTopCrimeTypes').mockResolvedValue([]);
        const allResourcesSpy = jest.spyOn(EducationalModel, 'getAllResources').mockResolvedValue([{ id: 1 }]);
        
        const result = await EducationalModel.getTailoredResources('123456789');
        expect(allResourcesSpy).toHaveBeenCalled();
        expect(result).toEqual([{ id: 1 }]);
        
        spy.mockRestore();
        allResourcesSpy.mockRestore();
      });

      it('should handle errors and throw', async () => {
        const spy = jest.spyOn(EducationalModel, 'getUserTopCrimeTypes').mockRejectedValue(new Error('fail'));
        await expect(EducationalModel.getTailoredResources('123456789')).rejects.toThrow('Error getting tailored resources: fail');
        spy.mockRestore();
      });
    });

    describe('calculateRelevanceScore', () => {
      it('should calculate relevance score correctly', () => {
        const score = EducationalModel.calculateRelevanceScore('burglary, drugs', ['burglary', 'drugs']);
        expect(score).toBeGreaterThan(0);
      });

      it('should return 0 if no match', () => {
        const score = EducationalModel.calculateRelevanceScore('robbery', ['burglary', 'drugs']);
        expect(score).toBe(0);
      });

      it('should handle higher priority crimes', () => {
        const score1 = EducationalModel.calculateRelevanceScore('burglary', ['burglary', 'drugs']);
        const score2 = EducationalModel.calculateRelevanceScore('drugs', ['burglary', 'drugs']);
        expect(score1).toBeGreaterThan(score2);
      });
    });
  });

  describe('EducationalController', () => {
    describe('getResources', () => {
      it('should return all resources if no userId', async () => {
        const spy = jest.spyOn(EducationalModel, 'getAllResources').mockResolvedValue([{ id: 1 }]);
        await EducationalController.getResources(req, res);
        expect(spy).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          resources: [{ id: 1 }],
          personalisation: {
            isPersonalised: false,
            userLocation: null,
            topLocalCrimes: null
          }
        });
        spy.mockRestore();
      });

      it('should return tailored resources if userId and h3', async () => {
        req.userId = 1;
        const user = { h3: '123456789' };
        const tailored = [{ id: 2, top_local_crimes: ['burglary'] }];
        
        User.findById.mockResolvedValue(user);
        const resourcesSpy = jest.spyOn(EducationalModel, 'getTailoredResources').mockResolvedValue(tailored);
        Crime.getLocationNameFromH3.mockResolvedValue('London');

        await EducationalController.getResources(req, res);
        expect(resourcesSpy).toHaveBeenCalledWith('123456789');
        expect(res.json).toHaveBeenCalledWith({
          resources: tailored,
          personalisation: {
            isPersonalised: true,
            userLocation: 'London',
            topLocalCrimes: ['burglary']
          }
        });
        resourcesSpy.mockRestore();
      });

      it('should return all resources if user has no h3', async () => {
        req.userId = 1;
        User.findById.mockResolvedValue({ h3: null });
        const spy = jest.spyOn(EducationalModel, 'getAllResources').mockResolvedValue([{ id: 1 }]);
        
        await EducationalController.getResources(req, res);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });

      it('should handle user lookup errors', async () => {
        req.userId = 1;
        User.findById.mockRejectedValue(new Error('User error'));
        const spy = jest.spyOn(EducationalModel, 'getAllResources').mockResolvedValue([{ id: 1 }]);
        
        await EducationalController.getResources(req, res);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
      });

      it('should handle main errors and return 500', async () => {
        const spy = jest.spyOn(EducationalModel, 'getAllResources').mockRejectedValue(new Error('fail'));
        
        await EducationalController.getResources(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Internal server error",
          message: "fail"
        });
        spy.mockRestore();
      });
    });

    describe('getResourcesByCrimeType', () => {
      it('should return 400 if crimeType is missing', async () => {
        req.params = {};
        await EducationalController.getResourcesByCrimeType(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Crime type is required" });
      });

      it('should return resources for valid crimeType', async () => {
        req.params = { crimeType: 'burglary' };
        const spy = jest.spyOn(EducationalModel, 'getResourcesByCrimeTypes').mockResolvedValue([{ id: 1 }]);
        
        await EducationalController.getResourcesByCrimeType(req, res);
        expect(spy).toHaveBeenCalledWith(['burglary']);
        expect(res.json).toHaveBeenCalledWith({
          resources: [{ id: 1 }],
          crimeType: 'burglary',
          personalisation: { isPersonalised: false }
        });
        spy.mockRestore();
      });

      it('should handle errors and return 500', async () => {
        req.params = { crimeType: 'burglary' };
        const spy = jest.spyOn(EducationalModel, 'getResourcesByCrimeTypes').mockRejectedValue(new Error('fail'));
        
        await EducationalController.getResourcesByCrimeType(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Internal server error",
          message: "fail"
        });
        spy.mockRestore();
      });
    });
  });
});
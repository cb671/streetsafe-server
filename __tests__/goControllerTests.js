jest.mock('../model/goModel', () => ({
  calculateRoutes: jest.fn(),
  reverseGeo: jest.fn(),
  search: jest.fn(),
  geocode: jest.fn()
}));

const GoController = require('../controller/goController');
const go = require('../model/goModel');
const errorHandler = require('../middleware/errorHandler');

describe('Go controller and error handling', () => {
  let req;
  let res;
  const next = jest.fn();

  const invokeController = async (handler) => {
    try {
      await handler();
    } catch (error) {
      errorHandler(error, req, res, next);
    }
  };

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: [],
      query: {},
      cookies: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn()
    };
  });

  it('returns a 400 for invalid route payloads', async () => {
    req.body = [1, 2, 3];

    await GoController.calculate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'body must be [[lon, lat], [lon, lat]]'
    });
  });

  it('surfaces upstream route failures to the error middleware', async () => {
    const upstreamError = Object.assign(new Error('Valhalla request failed'), {
      statusCode: 502,
      expose: true,
      details: {
        upstream: 'Valhalla',
        status: 503
      }
    });
    req.body = [[-0.1276, 51.5072], [-0.1425, 51.501]];
    go.calculateRoutes.mockRejectedValue(upstreamError);

    await invokeController(() => GoController.calculate(req, res));

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Valhalla request failed',
      details: {
        upstream: 'Valhalla',
        status: 503
      }
    });
  });

  it('returns unique successful routes from calculate', async () => {
    req.body = [[-0.1276, 51.5072], [-0.1425, 51.501]];
    go.calculateRoutes.mockResolvedValue([
      {
        code: 'Ok',
        routes: [{
          geometry: { coordinates: [[0, 0], [1, 1]] },
          distance: 1.2,
          duration: 10
        }],
        mode: 'direct'
      },
      {
        code: 'Ok',
        routes: [{
          geometry: { coordinates: [[0, 0], [1, 1]] },
          distance: 1.2,
          duration: 10
        }],
        mode: 'informed'
      },
      {
        code: 'Ok',
        routes: [{
          geometry: { coordinates: [[0, 0], [2, 2], [3, 3]] },
          distance: 2.5,
          duration: 20
        }],
        mode: 'cautious'
      },
      {
        code: 'Error',
        mode: 'ignored'
      }
    ]);

    await GoController.calculate(req, res);

    expect(res.json).toHaveBeenCalledWith([
      {
        code: 'Ok',
        routes: [{
          geometry: { coordinates: [[0, 0], [1, 1]] },
          distance: 1.2,
          duration: 10
        }],
        mode: 'direct'
      },
      {
        code: 'Ok',
        routes: [{
          geometry: { coordinates: [[0, 0], [2, 2], [3, 3]] },
          distance: 2.5,
          duration: 20
        }],
        mode: 'cautious'
      }
    ]);
  });

  it('returns JSON from the shared error middleware', () => {
    const err = Object.assign(new Error('Google Places request failed'), {
      statusCode: 502,
      expose: true,
      details: {
        upstream: 'Google Places',
        status: 403
      }
    });

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Google Places request failed',
      details: {
        upstream: 'Google Places',
        status: 403
      }
    });
  });

  it('returns a 400 for invalid reverse geocode payloads', async () => {
    req.body = ['bad', 51.5072];

    await GoController.reverseGeo(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'body must be [lon, lat]'
    });
  });

  it('reverse geocodes successfully with valid coordinates', async () => {
    req.body = [-0.1276, 51.5072];
    go.reverseGeo.mockResolvedValue({ display_name: 'London' });

    await GoController.reverseGeo(req, res);

    expect(go.reverseGeo).toHaveBeenCalledWith(-0.1276, 51.5072);
    expect(res.json).toHaveBeenCalledWith({ display_name: 'London' });
  });

  it('returns a 400 when search query q is missing', async () => {
    await GoController.search(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'q query parameter is required'
    });
  });

  it('returns a 400 for invalid bias values', async () => {
    req.query = {
      q: 'London',
      bias: 'abc,def'
    };

    await GoController.search(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'bias must be lon,lat'
    });
  });

  it('searches successfully with a valid query and bias', async () => {
    req.query = {
      q: ' London Victoria ',
      bias: '-0.1276,51.5072'
    };
    go.search.mockResolvedValue({ suggestions: [] });

    await GoController.search(req, res);

    expect(res.cookie).toHaveBeenCalledWith('st', expect.any(String), expect.any(Object));
    expect(go.search).toHaveBeenCalledWith('London Victoria', expect.any(String), [-0.1276, 51.5072]);
    expect(res.json).toHaveBeenCalledWith({ suggestions: [] });
  });

  it('returns a 400 when place is missing for geocode', async () => {
    await GoController.geocode(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'place query parameter is required'
    });
  });

  it('geocodes successfully with a valid place query parameter', async () => {
    req.query = {
      place: 'abc123'
    };
    go.geocode.mockResolvedValue({ results: [] });

    await GoController.geocode(req, res);

    expect(go.geocode).toHaveBeenCalledWith('abc123');
    expect(res.json).toHaveBeenCalledWith({ results: [] });
  });
});

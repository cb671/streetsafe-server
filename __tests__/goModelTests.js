global.fetch = jest.fn();

const Go = require('../model/goModel');

describe('Go model', () => {
  const originalEnv = process.env;

  const mockJsonResponse = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body))
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      VALHALLA_URL: 'http://valhalla.test',
      MAPS_API_KEY: 'maps-key'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('calculates all route modes through Valhalla', async () => {
    fetch
      .mockResolvedValueOnce(mockJsonResponse({ code: 'Ok', routes: [{ distance: 1, duration: 2, geometry: { coordinates: [] } }] }))
      .mockResolvedValueOnce(mockJsonResponse({ code: 'Ok', routes: [{ distance: 3, duration: 4, geometry: { coordinates: [] } }] }))
      .mockResolvedValueOnce(mockJsonResponse({ code: 'Ok', routes: [{ distance: 5, duration: 6, geometry: { coordinates: [] } }] }));

    const result = await Go.calculateRoutes([-0.1, 51.5], [-0.2, 51.6]);

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0][0]).toContain('http://valhalla.test/route?json=');
    expect(result.map((route) => route.mode)).toEqual(['direct', 'informed', 'cautious']);
  });

  it('throws when VALHALLA_URL is missing', async () => {
    delete process.env.VALHALLA_URL;

    await expect(Go.calculateRoutes([-0.1, 51.5], [-0.2, 51.6]))
      .rejects.toThrow('Please set VALHALLA_URL variable');
  });

  it('converts upstream non-OK responses into 502 errors', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve(JSON.stringify({ error: 'busy' }))
    });

    await expect(Go.reverseGeo(-0.1, 51.5)).rejects.toMatchObject({
      statusCode: 502,
      message: 'Nominatim request failed',
      details: {
        upstream: 'Nominatim',
        status: 503,
        body: { error: 'busy' }
      }
    });
  });

  it('converts invalid JSON responses into 502 errors', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('not json')
    });

    await expect(Go.reverseGeo(-0.1, 51.5)).rejects.toMatchObject({
      statusCode: 502,
      message: 'Nominatim returned invalid JSON',
      details: {
        upstream: 'Nominatim',
        status: 200
      }
    });
  });

  it('converts network failures into 502 errors', async () => {
    fetch.mockRejectedValue(new Error('network down'));

    await expect(Go.reverseGeo(-0.1, 51.5)).rejects.toMatchObject({
      statusCode: 502,
      message: 'Nominatim is unavailable',
      details: {
        upstream: 'Nominatim'
      }
    });
  });

  it('searches Google Places with location bias when provided', async () => {
    fetch.mockResolvedValue(mockJsonResponse({ suggestions: [{ placePrediction: { text: { text: 'London' } } }] }));

    const result = await Go.search('London', 'session-123', [-0.1276, 51.5072]);

    expect(fetch).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places:autocomplete',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Goog-Api-Key': 'maps-key'
        }),
        body: expect.stringContaining('"locationBias"')
      })
    );
    expect(result).toEqual({ suggestions: [{ placePrediction: { text: { text: 'London' } } }] });
  });

  it('throws when MAPS_API_KEY is missing for search', () => {
    delete process.env.MAPS_API_KEY;

    expect(() => Go.search('London', 'session-123')).toThrow('MAPS_API_KEY is not configured');
  });

  it('geocodes places through Google Geocoding', async () => {
    fetch.mockResolvedValue(mockJsonResponse({ place: 'abc123' }));

    const result = await Go.geocode('abc123');

    expect(fetch).toHaveBeenCalledWith(
      'https://geocode.googleapis.com/v4beta/geocode/places/abc123',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Goog-Api-Key': 'maps-key'
        })
      })
    );
    expect(result).toEqual({ place: 'abc123' });
  });

  it('throws when MAPS_API_KEY is missing for geocode', () => {
    delete process.env.MAPS_API_KEY;

    expect(() => Go.geocode('abc123')).toThrow('MAPS_API_KEY is not configured');
  });
});

const { createHttpError } = require("../utils/httpError");

const readJsonResponse = async (response, upstream) => {
  const raw = await response.text();
  let data = null;

  if(raw){
    try{
      data = JSON.parse(raw);
    }catch{
      throw createHttpError(502, `${upstream} returned invalid JSON`, {
        details: {
          upstream,
          status: response.status
        }
      });
    }
  }

  if(!response.ok){
    throw createHttpError(502, `${upstream} request failed`, {
      details: {
        upstream,
        status: response.status,
        body: data
      }
    });
  }

  return data;
};

const fetchJson = async (url, options, upstream) => {
  try{
    const response = await fetch(url, options);
    return readJsonResponse(response, upstream);
  }catch(error){
    if(error.statusCode) throw error;
    throw createHttpError(502, `${upstream} is unavailable`, {
      details: {
        upstream
      }
    });
  }
};

class Go{
  static async calculateRoutes([fromLon, fromLat], [toLon, toLat]){
    if(!process.env.VALHALLA_URL) throw new Error("Please set VALHALLA_URL variable. If using docker-compose.yml, this will be set for you.");

    const routeModes = [
      {
        mode: "direct",
        pedestrianOptions: {
          shortest: true,
          use_hills: 0.5,
          walking_speed: 5.1
        }
      },
      {
        mode: "informed",
        pedestrianOptions: {
          shortest: false,
          use_hills: 0.4,
          walking_speed: 5.1
        }
      },
      {
        mode: "cautious",
        pedestrianOptions: {
          shortest: false,
          use_hills: 0.2,
          walking_speed: 4.5
        }
      }
    ];

    const routes = await Promise.all(routeModes.map(({ mode, pedestrianOptions }) => {
      const body = {
        "costing": "pedestrian",
        "costing_options": {
          "pedestrian": {
            "use_ferry": 0,
            "shortest": pedestrianOptions.shortest,
            "use_hills": pedestrianOptions.use_hills,
            "walking_speed": pedestrianOptions.walking_speed,
            "step_penalty": 0,
            "max_hiking_difficulty": 1,
            "transit_start_end_max_distance": 2145,
            "transit_transfer_max_distance": 800
          }
        },
        "exclude_polygons": [],
        "locations": [{
          "lon": fromLon, "lat": fromLat, "type": "break"
        }, {"lon": toLon, "lat": toLat, "type": "break"}],
        "units": "kilometers",
        "alternates": 0,
        "id": "valhalla_directions",
        "shape_format": "geojson",
        "format": "osrm"
      };

      return fetchJson(
        `${process.env.VALHALLA_URL}/route?json=${encodeURIComponent(JSON.stringify(body))}`,
        undefined,
        "Valhalla"
      ).then(r=>({
        ...r,
        mode
      }));
    }));

    return routes;
  }

  static reverseGeo(lon, lat){
    return fetchJson(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'StreetSafe-App/1.0'
        }
      },
      "Nominatim"
    );
  }

  static search(query, sessionToken, bias){
    if(!process.env.MAPS_API_KEY){
      throw createHttpError(500, "MAPS_API_KEY is not configured");
    }

    const body = {
      input: query,
      sessionToken,
      includedRegionCodes: "uk"
    };
    if(!!bias){
      body.locationBias = {
        "circle": {
          "center": {
            "latitude": bias[1],
            "longitude": bias[0]
          },
          "radius": 2000.0
        }
      }
    }
    return fetchJson(
      `https://places.googleapis.com/v1/places:autocomplete`,
      {
        headers: {
          'User-Agent': 'StreetSafe-App/1.0',
          'X-Goog-Api-Key': process.env.MAPS_API_KEY,
          'Content-Type': 'Application/json'
        },
        method: "POST",
        body: JSON.stringify(body)
      },
      "Google Places"
    );
  }

  static geocode(placeId){
    if(!process.env.MAPS_API_KEY){
      throw createHttpError(500, "MAPS_API_KEY is not configured");
    }

    return fetchJson(
      `https://geocode.googleapis.com/v4beta/geocode/places/${placeId}`,
      {
        headers: {
          'User-Agent': 'StreetSafe-App/1.0',
          'X-Goog-Api-Key': process.env.MAPS_API_KEY,
        },
      }
      ,
      "Google Geocoding"
    );
  }
}

module.exports = Go;

class Go{
  static async calculateRoutes([fromLon, fromLat], [toLon, toLat]){
    if(!process.env.VALHALLA_URL) throw new Error("Please set VALHALLA_URL variable. If using docker-compose.yml, this will be set for you.");

    const routes = await Promise.all([0, 75, 200].map(crime_factor => {
      const body = {
        "costing": "safe",
        "costing_options": {
          "safe": {
            "use_ferry": 0,
            "use_living_streets": 1,
            "use_tracks": 0,
            "service_penalty": 15,
            "service_factor": 1,
            "shortest": false,
            "use_hills": 0.5,
            "walking_speed": 5.1,
            "walkway_factor": 1,
            "sidewalk_factor": 1,
            "alley_factor": 2,
            "driveway_factor": 5,
            "step_penalty": 0,
            "max_hiking_difficulty": 1,
            "use_lit": 0.15,
            "transit_start_end_max_distance": 2145,
            "transit_transfer_max_distance": 800,
            "crime_factor": crime_factor
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

      return fetch(`${process.env.VALHALLA_URL}/route?json=${encodeURIComponent(JSON.stringify(body))}`)
        .then(r=>r.json()).then(r=>({
        ...r,
        crime_factor
      }));
    }));

    return routes;
  }

  static reverseGeo(lon, lat){
    return fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'StreetSafe-App/1.0'
        }
      }
    ).then(r=>r.json());
  }

  static search(query, sessionToken, bias){
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
    return fetch(
      `https://places.googleapis.com/v1/places:autocomplete`,
      {
        headers: {
          'User-Agent': 'StreetSafe-App/1.0',
          'X-Goog-Api-Key': process.env.MAPS_API_KEY,
          'Content-Type': 'Application/json'
        },
        method: "POST",
        body: JSON.stringify(body)
      }
    ).then(r=>r.json());
  }

  static geocode(placeId){
    return fetch(
      `https://geocode.googleapis.com/v4beta/geocode/places/${placeId}`,
      {
        headers: {
          'User-Agent': 'StreetSafe-App/1.0',
          'X-Goog-Api-Key': process.env.MAPS_API_KEY,
        },
      }
    ).then(r=>r.json());
  }
}

module.exports = Go;

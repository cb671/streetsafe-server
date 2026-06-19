const go = require("../model/goModel");
const crypto = require("crypto");
const { getCookieOptions } = require("../config/security");

const isFiniteCoordinate = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max;

const isCoordinatePair = (value) =>
  Array.isArray(value) &&
  value.length === 2 &&
  isFiniteCoordinate(value[0], -180, 180) &&
  isFiniteCoordinate(value[1], -90, 90);

class GoController{
  static async calculate(req, res){
    if(
      !Array.isArray(req.body) ||
      req.body.length !== 2 ||
      req.body.some((coordinates) => !isCoordinatePair(coordinates)))
      return res.status(400).json({
        message: "body must be [[lon, lat], [lon, lat]]"
      });
    const routes = await go.calculateRoutes(
      req.body[0], req.body[1]
    );

    const existing = new Map();
    let routesRes = [];
    for(let r of routes){
      if(r.code !== "Ok") continue;
      const route = r.routes[0];
      let key = `g${route.geometry.coordinates.length}d${route.distance}d${route.duration}`;
      if(existing.has(key)) continue;
      routesRes.push(r);
      existing.set(key, true);
    }

    res.json(routesRes);
  }

  static async reverseGeo(req, res){
    if (!isCoordinatePair(req.body)) {
      return res.status(400).json({
        message: "body must be [lon, lat]"
      });
    }

    const [lon, lat] = req.body;
    const data = await go.reverseGeo(lon, lat);

    res.json(data);
  }

  static async search(req, res){
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!query) {
      return res.status(400).json({
        message: "q query parameter is required"
      });
    }

    if(!req.cookies.st) {
      const st = crypto.randomUUID();
      res.cookie("st", st, getCookieOptions(req, 1000 * 60 * 60 * 24 * 365));
      req.cookies.st = st;
    }

    let bias;
    if(req.query.bias){
      bias = req.query.bias.split(",").map((value) => Number.parseFloat(value.trim()));
      if (bias.length !== 2 || !isCoordinatePair(bias)) {
        return res.status(400).json({
          message: "bias must be lon,lat"
        });
      }
    }

    const data = await go.search(query, req.cookies.st, bias);
    res.json(data);
  }

  static async geocode(req, res){
    const placeId = typeof req.query.place === "string" ? req.query.place.trim() : "";
    if (!placeId) {
      return res.status(400).json({
        message: "place query parameter is required"
      });
    }

    const data = await go.geocode(placeId);
    res.json(data);
  }
}

module.exports = GoController;

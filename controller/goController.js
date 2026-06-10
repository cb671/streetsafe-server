const go = require("../model/goModel");
const crypto = require("crypto");
const { getCookieOptions } = require("../config/security");

class GoController{
  static async calculate(req, res){
    if(
      !Array.isArray(req.body) ||
      req.body.length !== 2 ||
      req.body.map(a =>
        !Array.isArray(a) ||
        a.length !== 2 ||
        a.map(c => !Number.isFinite(c)).filter(c => !!c).length !== 0
      ).filter(a => !!a).length !== 0)
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
    try{
      const [lon, lat] = req.body;
      const data = await go.reverseGeo(lon, lat);

      res.json(data);
    }catch(e){
      res.status(400).json({
        message: "body must be [lon, lat]"
      })
    }
  }

  static async search(req, res){
    if(!req.cookies.st) {
      const st = crypto.createHash("sha256").update(Math.random().toString()).digest().toString("hex").slice(0, 36);
      res.cookie("st", st, getCookieOptions(req, 1000 * 60 * 60 * 24 * 365));
      req.cookies.st = st;
    }

    let bias;
    if(req.query.bias){
      try{
        bias = req.query.bias.split(",").map(parseFloat);
      }catch{
        return res.status(400).json({
          message: "bias must be lon,lat"
        })
      }
    }

    const data = await go.search(req.query.q, req.cookies.st, bias);
    res.json(data);
  }

  static async geocode(req, res){
    const data = await go.geocode(req.query.place);
    res.json(data);
  }
}

module.exports = GoController;

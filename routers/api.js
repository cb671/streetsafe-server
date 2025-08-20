const {Router} = require("express");
const map = require("./map");
const trends = require("./trends");
const router = Router();


router.use("/map", map);
router.use("/trends", trends);

module.exports = router;
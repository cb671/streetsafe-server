const {Router} = require("express");
const map = require("./map");
const graphs = require("./graphs");
const auth = require("./auth");
const educational = require("./educational");
const emergServices = require("./emergServices");
const go = require("./go");
const router = Router();


router.use("/map", map);
router.use("/graphs", graphs);
router.use("/auth", auth);
router.use("/educational", educational);
router.use("/emerg-services", emergServices);
router.use("/go", go);

module.exports = router;

const {Router} = require("express");
const router = Router();

const map = require("./map");
const graphs = require("./graphs");
const auth = require("./auth");
const educational = require("./educational");
const emergencyServicesRoutes = require('./emergServicesRoutes');




router.use("/map", map);
router.use("/graphs", graphs);
router.use("/auth", auth);
router.use("/educational", educational);
router.use('/emergency/closest', emergencyServicesRoutes);



module.exports = router;
const {Router} = require("express");
const router = Router();

const map = require("./mapRoutes");
const emergencyServicesRoutes = require('./emergServicesRoutes');


router.use("/mapRoutes", map);

router.use('/emergency/closest', emergencyServicesRoutes);



module.exports = router;
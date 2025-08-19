const {Router} = require("express");
const map = require("./mapRoutes");
const router = Router();


router.use("/mapRoutes", map);


module.exports = router;
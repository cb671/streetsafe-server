const {Router} = require("express");
const map = require("./map");
const router = Router();


router.use("/map", map);


module.exports = router;
const {Router} = require("express");
const map = require("./map");
const graphs = require("./graphs");
const router = Router();


router.use("/map", map);
router.use("/graphs", graphs);

module.exports = router;
const {Router} = require("express");
const map = require("./map");
const graphs = require("./graphs");
const auth = require("./auth");
const router = Router();


router.use("/map", map);
router.use("/graphs", graphs);
router.use("/auth", auth);

module.exports = router;
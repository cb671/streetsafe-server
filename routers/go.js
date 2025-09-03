const {Router} = require("express");
const router = Router();
const GoController = require("../controller/goController");

router.post("/", GoController.calculate);
router.post("/reverse", GoController.reverseGeo);
router.post("/search", GoController.search);
router.post("/geocode", GoController.geocode);

module.exports = router;

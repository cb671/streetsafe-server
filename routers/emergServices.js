const express = require("express");
const router = express.Router();
const emergServicesController = require("../controller/emergServicesController");
const asyncHandler = require("../middleware/asyncHandler");

router.get("/closest", asyncHandler(emergServicesController.getClosest));

module.exports = router;

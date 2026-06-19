const express = require("express");
const HealthController = require("../controller/healthController");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(HealthController.getHealth));

module.exports = router;

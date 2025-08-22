const express = require('express');
const router = express.Router();
const EmergencyServicesController = require('../controller/emergServicesController');

// GET /api/emergency/closest?h3Index=8928308280fffff
router.get('/', EmergencyServicesController.getClosest);

module.exports = router;

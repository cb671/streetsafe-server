const express = require('express');
const router = express.Router();
const mapController = require('../controller/mapController');
const asyncHandler = require('../middleware/asyncHandler');


router.get('/', asyncHandler(mapController.getMapFeatures));
router.get('/features', asyncHandler(mapController.getMapFeatures));
router.get('/hex/:h3Index', asyncHandler(mapController.getSpecificHexagonData));
router.get('/hexagon/:h3Index', asyncHandler(mapController.getSpecificHexagonData));

module.exports = router;

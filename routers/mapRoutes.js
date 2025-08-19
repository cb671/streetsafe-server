const express = require('express');
const router = express.Router();
const mapController = require('../controller/mapController');


router.get('/', mapController.getMapFeatures);
router.get('/hexagon/:h3Index', mapController.getSpecificHexagonData);

module.exports = router;
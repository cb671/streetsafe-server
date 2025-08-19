const express = require('express');
const router = express.Router();
const mapController = require('../controller/mapController');


router.get('/', mapController.getMapFeatures);

module.exports = router;
const express = require('express');
const router = express.Router();
const trendsController = require('../controller/trendsController');


router.get('/proportions', trendsController.getCrimeProportions);
router.get('/trends', trendsController.getCrimeTrends);
router.get('/totals', trendsController.getCrimeTotals);


router.get('/locations', trendsController.getAvailableLocations);
router.get('/date-range', trendsController.getDateRange);
router.get('/crime-types', trendsController.getCrimeTypes);

module.exports = router;
const express = require('express');
const router = express.Router();
const graphsController = require('../controller/graphsController');


router.get('/proportions', graphsController.getCrimeProportions);
router.get('/trends', graphsController.getCrimeTrends);
router.get('/totals', graphsController.getCrimeTotals);


router.get('/locations', graphsController.getAvailableLocations);
router.get('/date-range', graphsController.getDateRange);
router.get('/crime-types', graphsController.getCrimeTypes);

module.exports = router;
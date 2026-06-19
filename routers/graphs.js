const express = require('express');
const router = express.Router();
const graphsController = require('../controller/graphsController');
const asyncHandler = require('../middleware/asyncHandler');


router.get('/proportions', asyncHandler(graphsController.getCrimeProportions));
router.get('/trends', asyncHandler(graphsController.getCrimeTrends));
router.get('/totals', asyncHandler(graphsController.getCrimeTotals));


router.get('/locations', asyncHandler(graphsController.getAvailableLocations));
router.get('/date-range', asyncHandler(graphsController.getDateRange));
router.get('/dates', asyncHandler(graphsController.getDateRange));
router.get('/crime-types', asyncHandler(graphsController.getCrimeTypes));

module.exports = router;

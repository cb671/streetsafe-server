const {Router} = require("express");
const router = Router();
const GoController = require("../controller/goController");
const asyncHandler = require("../middleware/asyncHandler");
const { createRateLimiter } = require('../middleware/rateLimit');
const { rateLimitPolicies } = require('../config/rateLimit');

const externalApiRateLimit = createRateLimiter({
  ...rateLimitPolicies.externalApi,
  keyPrefix: 'external-api',
  message: 'Too many route and location requests. Please try again later.'
});

router.post("/", externalApiRateLimit, asyncHandler(GoController.calculate));
router.post("/reverse", externalApiRateLimit, asyncHandler(GoController.reverseGeo));
router.post("/search", externalApiRateLimit, asyncHandler(GoController.search));
router.post("/geocode", externalApiRateLimit, asyncHandler(GoController.geocode));

module.exports = router;

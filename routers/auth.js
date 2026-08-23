const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");
const authenticateToken = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { createRateLimiter } = require("../middleware/rateLimit");
const { rateLimitPolicies } = require("../config/rateLimit");

const authRateLimit = createRateLimiter({
  ...rateLimitPolicies.auth,
  keyPrefix: "auth",
  message: "Too many authentication attempts. Please try again later.",
});

router.post("/register", authRateLimit, asyncHandler(authController.register));
router.get(
  "/confirm-email",
  authRateLimit,
  asyncHandler(authController.confirmEmail),
);
router.post(
  "/resend-confirmation",
  authRateLimit,
  asyncHandler(authController.resendConfirmation),
);
router.post("/login", authRateLimit, asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.get(
  "/profile",
  authenticateToken,
  asyncHandler(authController.getProfile),
);

module.exports = router;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const rateLimitPolicies = {
  auth: {
    windowMs: parsePositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    maxRequests: parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 10)
  },
  externalApi: {
    windowMs: parsePositiveInt(process.env.EXTERNAL_RATE_LIMIT_WINDOW_MS, 60 * 1000),
    maxRequests: parsePositiveInt(process.env.EXTERNAL_RATE_LIMIT_MAX, 30)
  }
};

module.exports = {
  parsePositiveInt,
  rateLimitPolicies
};

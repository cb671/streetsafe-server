const getClientIdentifier = (req) =>
  req.ip ||
  req.headers["x-forwarded-for"] ||
  req.connection?.remoteAddress ||
  "unknown";

const createRateLimiter = ({ windowMs, maxRequests, keyPrefix, message }) => {
  const store = new Map();

  const middleware = (req, res, next) => {
    const now = Date.now();
    const clientId = getClientIdentifier(req);
    const key = `${keyPrefix}:${clientId}`;
    const entry = store.get(key);

    if (!entry || now >= entry.resetAt) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        message,
        error: "Too many requests",
        retryAfterSeconds
      });
    }

    entry.count += 1;
    return next();
  };

  middleware._store = store;
  middleware._reset = () => store.clear();

  return middleware;
};

module.exports = {
  createRateLimiter,
  getClientIdentifier
};

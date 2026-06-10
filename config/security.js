const DEFAULT_ALLOWED_ORIGINS = [
  "https://streetsafe.space",
  "https://streetsafe-client.onrender.com"
];

const normalizeOrigin = (origin) => origin.replace(/\/+$/, "");

const parseAllowedOrigins = () => {
  const configuredOrigins = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map(normalizeOrigin)
    : [];

  return configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
};

const allowedOrigins = parseAllowedOrigins();

const isProduction = process.env.NODE_ENV === "production";

const getCookieOptions = (req, maxAge) => {
  const isSecure = isProduction || req?.secure;

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? "none" : "lax",
    ...(maxAge ? { maxAge } : {})
  };
};

module.exports = {
  allowedOrigins,
  getCookieOptions,
  isProduction,
  normalizeOrigin
};

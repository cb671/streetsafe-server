const requiredEnvVars = [
  "DB_URL",
  "JWT_SECRET",
  "VALHALLA_URL",
  "MAPS_API_KEY",
  "BREVO_API_KEY",
  "BREVO_CONFIRMATION_TEMPLATE_ID",
  "EMAIL_CONFIRMATION_URL",
];

const getMissingEnvVars = (env = process.env) =>
  requiredEnvVars.filter((name) => !env[name] || !String(env[name]).trim());

const getConfigStatus = (env = process.env) => {
  const missing = getMissingEnvVars(env);

  return {
    ok: missing.length === 0,
    required: requiredEnvVars,
    missing,
  };
};

const assertStartupConfig = (env = process.env) => {
  const status = getConfigStatus(env);

  if (!status.ok) {
    throw new Error(
      `Missing required environment variables: ${status.missing.join(", ")}`,
    );
  }
};

module.exports = {
  assertStartupConfig,
  getConfigStatus,
  getMissingEnvVars,
  requiredEnvVars,
};

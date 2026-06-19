const createHttpError = (statusCode, message, options = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = options.expose ?? statusCode < 500;

  if(options.error) error.error = options.error;
  if(options.details) error.details = options.details;

  return error;
};

module.exports = {
  createHttpError
};

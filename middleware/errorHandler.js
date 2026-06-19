const errorHandler = (err, req, res, next) => {
  if(res.headersSent) return next(err);

  const statusCode = err.statusCode || 500;
  const shouldExposeMessage = err.expose || statusCode < 500;
  const payload = {
    message: shouldExposeMessage ? err.message : "Internal server error"
  };

  if(err.error) payload.error = err.error;
  if(err.details) payload.details = err.details;

  if(statusCode >= 500){
    console.error(err);
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;

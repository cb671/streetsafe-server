const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({
      error: "Access denied. No token provided."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(403).json({
      error: "Invalid token"
    });
  }
};

module.exports = authenticateToken;
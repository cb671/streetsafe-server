const jwt = require("jsonwebtoken");
const User = require("../model/userModel");

const authenticateToken = async (req, res, next) => {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({
      error: "Please sign in.",
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      error: "Invalid or expired session. Please sign in.",
    });
  }

  try {
    const user = await User.findById(decoded.userId);

    if (
      !user ||
      !Number.isInteger(decoded.sessionVersion) ||
      decoded.sessionVersion !== user.session_version
    ) {
      return res.status(401).json({
        error: "Session expired. Please sign in again.",
      });
    }

    req.userId = user.id;
    req.userEmail = user.email;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticateToken;

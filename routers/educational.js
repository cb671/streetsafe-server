const express = require('express');
const router = express.Router();
const educationalController = require('../controller/educationalController');
const authenticateToken = require('../middleware/auth');

const optionalAuth = (req, res, next) => {
  const token = req.cookies.auth_token;
  
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
    } catch (error) {
      console.log('Invalid token continuing without user data');
    }
  }
  
  next();
};


router.get('/', optionalAuth, educationalController.getResources);
router.get('/crime-type/:crimeType', educationalController.getResourcesByCrimeType);


module.exports = router;
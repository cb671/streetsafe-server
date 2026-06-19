const express = require('express');
const router = express.Router();
const educationalController = require('../controller/educationalController');
const asyncHandler = require('../middleware/asyncHandler');

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


router.get('/', optionalAuth, asyncHandler(educationalController.getResources));
router.get('/resources', optionalAuth, asyncHandler(educationalController.getResources));
router.get('/crime-type/:crimeType', asyncHandler(educationalController.getResourcesByCrimeType));


module.exports = router;

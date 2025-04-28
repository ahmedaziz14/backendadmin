const express = require('express');
const router = express.Router();
const Reaquest = require('../controllers/signupRequestController');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/', authenticateToken,Reaquest.getSignupRequests);

module.exports = router;
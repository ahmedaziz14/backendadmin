const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/AdminAuth');

router.post('/signup', adminAuthController.adminSignUp);
router.post('/signin', adminAuthController.adminSignIn);

module.exports = router;
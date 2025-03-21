const express = require('express');
const router = express.Router();
const adminController = require('../controllers/ManageUsers');
const authenticateToken = require('../middleware/authenticateToken');
router.get('/users', authenticateToken,adminController.getAllUsers);
router.get('/user/product/:productKey', authenticateToken,adminController.getUserByProductKey);
router.delete('/user/product/:productKey',authenticateToken, adminController.deleteUser);

module.exports = router;
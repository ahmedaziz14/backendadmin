const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatControllers');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/send', authenticateToken, chatController.sendMessage);
router.get('/history', authenticateToken, chatController.getChatHistory);


module.exports = router;
const express = require('express');
const router = express.Router();
const notif = require('../controllers/notificationsController');
const authenticateToken = require('../middleware/authenticateToken');
router.get('/', authenticateToken,notif.getNotifications);
router.put('/:id/mark' , authenticateToken ,notif.markNotficationAsRead ) ; 
router.delete("/:id" , authenticateToken , notif.deleteNotification) ; 
router.delete("/" , authenticateToken , notif.deleteAllNotifications) ; 



module.exports = router;
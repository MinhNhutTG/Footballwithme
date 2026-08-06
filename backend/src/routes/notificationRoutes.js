const express = require('express');
const { list, unreadCount, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, list);
router.get('/unread-count', protect, unreadCount);
router.post('/mark-read', protect, markAllRead);

module.exports = router;

const express = require('express');
const { register, login, me, toggleFavorite } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, me);
router.post('/favorites/:postId', protect, toggleFavorite);

module.exports = router;

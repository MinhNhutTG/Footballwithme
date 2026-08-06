const express = require('express');
const { create, list } = require('../controllers/logController');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', optionalAuth, create);
router.get('/', protect, adminOnly, list);

module.exports = router;

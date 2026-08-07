const express = require('express');
const { getOverview } = require('../controllers/analyticsController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', protect, adminOnly, getOverview);

module.exports = router;

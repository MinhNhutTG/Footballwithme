const express = require('express');
const { get, update } = require('../controllers/settingsController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', get);
router.put('/', protect, adminOnly, update);

module.exports = router;

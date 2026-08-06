const express = require('express');
const { submit } = require('../controllers/contactController');
const { contactLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/', contactLimiter, submit);

module.exports = router;

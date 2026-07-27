
const express = require('express');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { uploadFile } = require('../controllers/uploadController');
const router = express.Router();
router.post('/', protect, upload.single('file'), uploadFile);
module.exports = router;

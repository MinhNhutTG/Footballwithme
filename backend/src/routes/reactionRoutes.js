const express = require('express');
const {getCounts, getMine, setReaction} = require('../controllers/reactionController');
const {protect} = require('../middleware/auth');

const router = express.Router();
router.get('/', getCounts);
router.get("/me", protect, getMine);
router.post('/', protect, setReaction);

module.exports = router;
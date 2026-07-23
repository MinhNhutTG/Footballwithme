const express = require('express');
const { list, create, remove } = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', list);
router.post('/', protect, create);
router.delete('/:id', protect, remove);

module.exports = router;

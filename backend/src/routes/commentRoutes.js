const express = require('express');
const { list, create, remove, listAll } = require('../controllers/commentController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', protect, adminOnly, listAll);
router.get('/', list);
router.post('/', protect, create);
router.delete('/:id', protect, remove);

module.exports = router;

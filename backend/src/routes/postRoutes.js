const express = require('express');
const { list, getById, create, update, remove, incrementViews} = require('../controllers/postController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', list);
router.get('/:id', getById);
router.post('/', protect, adminOnly, create);
router.put('/:id', protect, adminOnly, update);
router.delete('/:id', protect, adminOnly, remove);
router.post('/:id/view', incrementViews);
module.exports = router;

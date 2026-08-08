const express = require('express');
const { list, count, updateRole, remove, getMe, updateMe, changePassword, deleteMe } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/count', count);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);
router.delete('/me', protect, deleteMe);
router.get('/', protect, adminOnly, list);
router.put('/:id/role', protect, adminOnly, updateRole);
router.delete('/:id', protect, adminOnly, remove);

module.exports = router;

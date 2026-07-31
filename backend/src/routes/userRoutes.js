const express = require('express');
const { list, updateRole, remove, getMe, updateMe, changePassword } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.get('/', protect, adminOnly, list);
router.put('/:id/role', protect, adminOnly, updateRole);
router.delete('/:id', protect, adminOnly, remove);
router.put('/change-password', protect, changePassword);

module.exports = router;

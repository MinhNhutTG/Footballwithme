const User = require('../models/User');
const Comment = require('../models/Comment');

async function list(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function count(req, res, next) {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

async function updateRole(req, res, next) {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Role must be "user" or "admin"' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const data = user.toJSON();
    data.hasPassword = !!user.password;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const { name, bio, avatarUrl } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim(), bio: (bio || '').trim(), ...(avatarUrl !== undefined && { avatarUrl }) },
      { new: true, runValidators: true }
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { currentPassword, newPassword } = req.body;
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    if (user.password) {
      if (!currentPassword || !(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  }
  catch (err) {
    next(err);
  }
}

async function deleteMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.password){
      const {password} = req.body;
      if (!password || !(await user.comparePassword(password))){
        return res.status(401).json({ message: 'Password is incorrect' });
      }
    }
    await Comment.deleteMany({author: user._id});
    await User.findByIdAndDelete(user._id);
    res.json({success: true});
  }
  catch (err){
    next(err);
  }
}

module.exports = { list, count, updateRole, remove, getMe, updateMe, changePassword, deleteMe };

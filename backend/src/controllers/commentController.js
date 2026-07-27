const Comment = require('../models/Comment');

async function list(req, res, next) {
  try {
    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: 'postId is required' });

    const comments = await Comment.find({ postId })
      .populate('author', 'name avatarUrl')
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { postId, text } = req.body;
    if (!postId || !text?.trim()) {
      return res.status(400).json({ message: 'postId and text are required' });
    }

    const comment = await Comment.create({
      postId,
      text: text.trim(),
      author: req.user.id,
    });

    await comment.populate('author', 'name avatarUrl');
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner = comment.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await comment.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove };

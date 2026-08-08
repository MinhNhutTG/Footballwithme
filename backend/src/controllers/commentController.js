const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const sendReplyNotification = require('../utils/sendReplyNotification');

async function notifyReplyAuthor(rootComment, replyComment, postId) {
  const recipient = await User.findById(rootComment.author).select('name email').catch(() => null);
  if (!recipient) return;

  const postUrl = `${process.env.FRONTEND_URL}/bai-viet/${postId}`;
  const originalText = rootComment.isDeleted ? '(bình luận đã bị xoá)' : rootComment.text;

  try {
    await Notification.create({
      recipient: recipient._id,
      type: 'reply',
      message: `${replyComment.author.name} đã trả lời bình luận của bạn`,
      link: `/bai-viet/${postId}`,
    });
  } catch (err) {
    console.error('Tạo thông báo reply thất bại:', err.message);
  }

  try {
    await sendReplyNotification(recipient.email, {
      replierName: replyComment.author.name,
      originalText,
      replyText: replyComment.text,
      postUrl,
    });
  } catch (err) {
    console.error('Gửi email thông báo reply thất bại:', err.message);
  }
}

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

async function listAll(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Comment.find({ isDeleted: false })
        .populate('author', 'name avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({ isDeleted: false }),
    ]);

    const postIds = [...new Set(data.map((c) => c.postId))];
    const posts = await Post.find({ _id: { $in: postIds } }).select('title');
    const titleById = Object.fromEntries(posts.map((p) => [p._id.toString(), p.title.vi]));

    const withPostTitle = data.map((c) => ({
      ...c.toObject(),
      postTitle: titleById[c.postId] || null,
    }));

    res.json({ data: withPostTitle, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { postId, text, parentId } = req.body;
    if (!postId || !text?.trim()) {
      return res.status(400).json({ message: 'postId and text are required' });
    }

    let resolvedParentId = null;
    let rootComment = null;
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) return res.status(404).json({ message: 'Parent comment not found' });
      // Luôn gắn reply về comment gốc, kể cả khi bấm "Trả lời" từ 1 reply khác (flatten 1 cấp)
      resolvedParentId = parent.parentId ? parent.parentId : parent._id;
      rootComment = parent.parentId ? await Comment.findById(resolvedParentId) : parent;
    }

    const comment = await Comment.create({
      postId,
      text: text.trim(),
      author: req.user.id,
      parentId: resolvedParentId,
    });

    await comment.populate('author', 'name avatarUrl');

    if (rootComment && rootComment.author.toString() !== req.user.id) {
      // Không await — gửi email chạy nền, không chặn response tạo reply
      notifyReplyAuthor(rootComment, comment, postId);
    }

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

    // Reply luôn xoá cứng — thiết kế chỉ 1 cấp nên reply không thể có "con"
    if (comment.parentId) {
      await comment.deleteOne();
      return res.json({ mode: 'hard', id: comment._id });
    }

    // Comment gốc: còn reply thì xoá mềm để giữ thread, hết reply thì xoá cứng như cũ
    const replyCount = await Comment.countDocuments({ parentId: comment._id });
    if (replyCount > 0) {
      comment.isDeleted = true;
      comment.text = '';
      await comment.save();
      await comment.populate('author', 'name avatarUrl');
      return res.json({ mode: 'soft', comment });
    }

    await comment.deleteOne();
    res.json({ mode: 'hard', id: comment._id });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, remove, listAll };

const Post = require('../models/Post');
const Category = require('../models/Category');
const { sanitizeBilingualRichText } = require('../utils/sanitize');

async function list(req, res, next) {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await Category.findOne({ slug: req.body.category });
    if (!category) return res.status(400).json({ message: 'Danh mục không hợp lệ' });

    const payload = {
      ...req.body,
      body: sanitizeBilingualRichText(req.body.body),
      intro: sanitizeBilingualRichText(req.body.intro),
      quote: sanitizeBilingualRichText(req.body.quote),
      mistake: sanitizeBilingualRichText(req.body.mistake),
    };
    const post = await Post.create(payload);
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    if (req.body.category) {
      const category = await Category.findOne({ slug: req.body.category });
      if (!category) return res.status(400).json({ message: 'Danh mục không hợp lệ' });
    }

    const payload = {
      ...req.body,
      body: sanitizeBilingualRichText(req.body.body),
      intro: sanitizeBilingualRichText(req.body.intro),
      quote: sanitizeBilingualRichText(req.body.quote),
      mistake: sanitizeBilingualRichText(req.body.mistake),
    };
    const post = await Post.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function incrementViews(req, res, next) {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id,
      { $inc: { views: 1 } }, { new: true });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ views: post.views });

  }
  catch (err) {
    next(err);
  }
}
module.exports = { list, getById, create, update, remove, incrementViews };

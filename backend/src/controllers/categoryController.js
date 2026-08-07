const Category = require('../models/Category');
const Post = require('../models/Post');

async function list(req, res, next) {
  try {
    const categories = await Category.find().sort({ createdAt: 1 });
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Slug đã tồn tại' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { slug, ...rest } = req.body; // slug không cho sửa sau khi tạo
    const category = await Category.findByIdAndUpdate(req.params.id, rest, {
      new: true,
      runValidators: true,
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const postCount = await Post.countDocuments({ category: category.slug });
    if (postCount > 0) {
      return res.status(409).json({ message: `Còn ${postCount} bài viết thuộc danh mục này, không thể xoá` });
    }

    await category.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };

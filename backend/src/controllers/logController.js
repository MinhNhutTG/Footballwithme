const VisitLog = require('../models/VisitLog');

async function create(req, res, next) {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ message: 'path is required' });

    await VisitLog.create({ path, user: req.user?.id || null });
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      VisitLog.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      VisitLog.countDocuments(),
    ]);

    res.json({ data, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list };

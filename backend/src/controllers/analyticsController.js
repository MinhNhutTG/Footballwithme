const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Reaction = require('../models/Reaction');
const VisitLog = require('../models/VisitLog');
const Category = require('../models/Category');

async function getOverview(req, res, next) {
  try {
    const now = new Date();
    const trafficStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

    const [
      totalPosts,
      totalUsers,
      totalComments,
      viewsAgg,
      topPosts,
      reactionAgg,
      categoryAgg,
      trafficAgg,
      allCategories,
    ] = await Promise.all([
      Post.countDocuments(),
      User.countDocuments(),
      Comment.countDocuments({ isDeleted: false }),
      Post.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Post.find().sort({ views: -1 }).limit(5).select('title category views'),
      Reaction.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Post.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      VisitLog.aggregate([
        { $match: { createdAt: { $gte: trafficStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
      Category.find().select('slug'),
    ]);

    const totalViews = viewsAgg[0]?.total || 0;

    const reactionCounts = { like: 0, dislike: 0, haha: 0, angry: 0 };
    reactionAgg.forEach((r) => { reactionCounts[r._id] = r.count; });

    const categoryCounts = {};
    allCategories.forEach((c) => { categoryCounts[c.slug] = 0; });
    categoryAgg.forEach((c) => { categoryCounts[c._id] = c.count; });

    const trafficMap = {};
    trafficAgg.forEach((t) => { trafficMap[t._id] = t.count; });
    const traffic = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      traffic.push({ date: key, count: trafficMap[key] || 0 });
    }

    res.json({
      totals: { posts: totalPosts, users: totalUsers, comments: totalComments, views: totalViews },
      topPosts,
      reactionCounts,
      categoryCounts,
      traffic,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview };


const Reaction = require('../models/Reaction');

// Create a new reaction
async function countByType(postId) {
    const rows = await Reaction.aggregate([
        { $match: { postId } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const counts = { like: 0, dislike: 0, haha: 0, angry: 0 };
    rows.forEach((r) => { counts[r._id] = r.count; });
    return counts;
}

async function getCounts(req, res, next) {
    try {
        const { postId } = req.query;
        if (!postId) {
            return res.status(400).json({ message: 'postId is required' });
        }
        const counts = await countByType(postId);
        res.json(counts);
    }
    catch (err) {
        next(err);
    }
}

async function getMine(req, res, next) {
    try {
        const { postId } = req.query;
        if (!postId) return res.status(400).json({ message: 'postId is required' });

        const reaction = await Reaction.findOne({ postId, user: req.user.id });
        res.json({ type: reaction ? reaction.type : null });
    } catch (err) {
        next(err);
    }
}

async function setReaction(req, res, next) {
    try {
        const { postId, type } = req.body;
        if (!postId || !type) {
            return res.status(400).json({ message: 'postId and type are required' });
        }
        if (!Reaction.TYPES.includes(type)) {
            return res.status(400).json({ message: 'Invalid reaction type' });
        }

        const existingReaction = await Reaction.findOne({ postId, user: req.user.id });
        let mine = type;
        if (!existingReaction) {
            await Reaction.create({ postId, user: req.user.id, type });
        }
        else if (existingReaction.type === type) {
            await existingReaction.deleteOne();
            mine = null;
        }
        else {
            existingReaction.type = type;
            await existingReaction.save();
        }

        const counts = await countByType(postId);
        res.json({ counts, mine });
    }
    catch (err) {
        next(err);
    }
}

module.exports = {
    getCounts,
    getMine,
    setReaction,
};
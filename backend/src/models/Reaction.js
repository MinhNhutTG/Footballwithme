const mongoose = require('mongoose');
const REACTION_TYPES = ['like', 'dislike', 'haha', 'angry'];

const reactionSchema = new mongoose.Schema(
    {
        postId: { type: String, required: true, index: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        type: { type: String, enum: REACTION_TYPES, required: true },
    },
    { timestamps: true }
);

reactionSchema.index({ postId: 1, user: 1 }, { unique: true });

const Reaction = mongoose.model('Reaction', reactionSchema);
Reaction.TYPES = REACTION_TYPES;

module.exports = Reaction;
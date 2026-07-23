const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    postId: { type: String, required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);

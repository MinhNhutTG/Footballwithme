const mongoose = require('mongoose');

const visitLogSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

visitLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('VisitLog', visitLogSchema);

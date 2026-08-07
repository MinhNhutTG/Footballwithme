const mongoose = require('mongoose');

const bilingualString = { vi: String, en: String };

const categorySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/,
    },
    label: { type: bilingualString, required: true },
    desc: { type: bilingualString, default: () => ({ vi: '', en: '' }) },
    gradient: { type: String, default: 'from-fwm-card to-fwm-card-2' },
    imageUrl: { type: String, default: '' },
    hasSteps: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);

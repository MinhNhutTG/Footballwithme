const mongoose = require('mongoose');

const bilingualString = { vi: String, en: String };

const stepSchema = new mongoose.Schema(
  {
    title: bilingualString,
    desc: bilingualString,
    keys: [
      {
        kind: { type: String, default: 'default' },
        label: String,
      },
    ],
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
    },
    gradient: { type: String, default: 'from-fwm-card to-fwm-card-2' },
    tags: { type: [String], default: [] },
    title: { type: bilingualString, required: true },
    excerpt: { type: bilingualString, required: true },
    intro: { type: bilingualString, default: () => ({ vi: '', en: '' }) },
    body: { type: bilingualString, default: () => ({ vi: '', en: '' }) },
    quote: { type: bilingualString, default: () => ({ vi: '', en: '' }) },
    mistake: { type: bilingualString, default: () => ({ vi: '', en: '' }) },
    steps: { type: [stepSchema], default: [] },
    coverImageUrl: {type: String, default: ''},
    videoUrl: {type: String, default: ''},
    views: {type: Number, default: 0},
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);

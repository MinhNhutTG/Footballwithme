const mongoose = require('mongoose');

const bilingualString = { vi: String, en: String };

const siteSettingsSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: 'FootballWithMe' },
    description: { type: bilingualString, default: () => ({ vi: '', en: '' }) },
    logoUrl: { type: String, default: '' },
    socialLinks: { type: [{ label: String, url: String }], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);

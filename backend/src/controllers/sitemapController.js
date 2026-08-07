const Post = require('../models/Post');
const Category = require('../models/Category');

const STATIC_PATHS = ['/', '/gioi-thieu', '/lien-he', '/chuyen-muc'];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function generate(req, res, next) {
  try {
    const baseUrl = process.env.FRONTEND_URL;
    const [categories, posts] = await Promise.all([
      Category.find().select('slug'),
      Post.find().select('_id updatedAt').sort({ updatedAt: -1 }),
    ]);

    const urls = [
      ...STATIC_PATHS.map((path) => ({ loc: `${baseUrl}${path}` })),
      ...categories.map((cat) => ({ loc: `${baseUrl}/chuyen-muc/${cat.slug}` })),
      ...posts.map((post) => ({
        loc: `${baseUrl}/bai-viet/${post._id}`,
        lastmod: post.updatedAt.toISOString(),
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.type('application/xml').send(xml);
  } catch (err) {
    next(err);
  }
}

module.exports = { generate };

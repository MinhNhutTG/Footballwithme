const sanitizeHtml = require('sanitize-html');

const RICH_TEXT_OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 's', 'strike',
    'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr',
  ],
  allowedAttributes: {},
};

function sanitizeRichText(html) {
  return sanitizeHtml(html || '', RICH_TEXT_OPTIONS);
}

function sanitizeBilingualRichText(field) {
  if (!field) return field;
  return {
    vi: sanitizeRichText(field.vi),
    en: sanitizeRichText(field.en),
  };
}

module.exports = { sanitizeRichText, sanitizeBilingualRichText };

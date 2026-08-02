const sanitizeHtml = require('sanitize-html');

// Strips all HTML by default — posts/comments/bios are plain text in this
// app (no rich text editor in Phase 1), so the safest default is to escape
// everything rather than allow a curated tag list. If rich text is added
// later, switch allowedTags to a small explicit allow-list instead of [].
function stripHtml(value) {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
}

// Sanitizes the given top-level body fields in place before they reach a
// controller / Mongoose model. Use per-route: sanitizeFields(['content'])
function sanitizeFields(fields) {
  return (req, res, next) => {
    fields.forEach((field) => {
      if (req.body && typeof req.body[field] === 'string') {
        req.body[field] = stripHtml(req.body[field]);
      }
    });
    next();
  };
}

module.exports = { stripHtml, sanitizeFields };

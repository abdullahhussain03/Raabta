const { MAX_UPLOAD_MB } = require('./upload');

// Central error handler. Always the last middleware. Logs full detail
// server-side, but only ever returns a generic message to the client in
// production so DB/internal errors never leak.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(`[error] ${req.method} ${req.originalUrl} -> ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Multer errors (file too large, unexpected field) deserve specific
  // messages — a generic 500 for a too-big upload is a terrible UX.
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `File too large — the maximum upload size is ${MAX_UPLOAD_MB}MB.` });
    }
    return res.status(400).json({ message: err.message });
  }

  const status = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(status).json({
    message: isProd && status === 500 ? 'Something went wrong. Please try again.' : err.publicMessage || err.message,
  });
}

function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

module.exports = { errorHandler, notFound };

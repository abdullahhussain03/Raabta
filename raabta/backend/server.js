require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./config/db');
const { generalLimiter } = require('./middleware/rateLimiters');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const universityRoutes = require('./routes/universityRoutes');
const communityRoutes = require('./routes/communityRoutes');
const groupRoutes = require('./routes/groupRoutes');
const postRoutes = require('./routes/postRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const dmRoutes = require('./routes/dmRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- Sentry (backend) ---
// Gated entirely behind SENTRY_DSN so local dev without a DSN configured
// just runs with Sentry disabled rather than erroring.
let Sentry = null;
if (process.env.SENTRY_DSN) {
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

const app = express();

// Trust the first proxy hop — required for correct req.ip behind Render's
// load balancer, which rate limiting depends on.
app.set('trust proxy', 1);

if (Sentry) app.use(Sentry.Handlers.requestHandler());

// --- Security headers ---
app.use(helmet());

// --- CORS: only the actual frontend origin(s), never '*' — required since
// we use credentialed (cookie-based) requests. Read from FRONTEND_URL so
// this works unchanged across local dev, Vercel preview, and production. ---
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  })
);

// --- HTTPS redirect in production (Render sets x-forwarded-proto) ---
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $/. operators from req.body/query/params to block NoSQL injection

// General API-wide rate limit; auth-specific endpoints layer a tighter
// limiter on top (see routes/authRoutes.js).
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// NOTE: file uploads (resources, profile pictures) go straight to
// Cloudinary (see middleware/upload.js) — there is no local uploads
// directory and nothing is served via express.static, since Render's
// filesystem is ephemeral and wiped on every redeploy.

app.use(notFound);
if (Sentry) app.use(Sentry.Handlers.errorHandler());
app.use(errorHandler);

// Render assigns PORT dynamically — never hardcode 5000 in production.
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`[server] Raabta API listening on port ${PORT}`));
});

module.exports = app;

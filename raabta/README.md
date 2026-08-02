# Raabta — Verified Student Community Platform

Raabta ("connection" in Urdu) is a verified, student-only social and community
platform for university students in Pakistan. Only students with a verified
university email can create an account.

This repo is the **Phase 1 MVP**: university-gated signup, communities,
groups, posts/comments, course resource sharing, direct messages, reporting
& moderation, and an admin panel — plus the security hardening described in
the build spec.

## Tech stack

- **Backend:** Node.js + Express, MongoDB + Mongoose, JWT auth (httpOnly
  cookies), bcrypt
- **Frontend:** React (Vite), React Router, Tailwind CSS
- **File storage:** Cloudinary (used from day one, not local disk — Render's
  filesystem is ephemeral and files would be lost on every redeploy)
- **Analytics:** Google Analytics 4, gated behind `VITE_GA_MEASUREMENT_ID`
  and a cookie-consent banner
- **Error monitoring:** Sentry, on both backend and frontend, gated behind
  `SENTRY_DSN` / `VITE_SENTRY_DSN`
- **Deployment targets:** Frontend → Vercel, Backend → Render, Database →
  MongoDB Atlas (see [Deployment](#deployment) below)

## Project structure

```
raabta/
  backend/          Express API
    config/         DB connection
    models/         Mongoose schemas
    middleware/      auth, role gating, rate limiting, sanitization, uploads
    controllers/     route handlers / business logic
    routes/          Express routers
    utils/           tokens, email, audit logging
    seed.js          creates a sample university, admin user, communities
    server.js        app entrypoint
  frontend/         Vite + React app
```

## Prerequisites

- Node.js 18+
- A running MongoDB instance (local, or a free MongoDB Atlas cluster)
- An SMTP account for sending verification/reset/OTP emails (e.g. a free
  Mailtrap sandbox for local dev, or SendGrid/SES in production)

## Backend setup

```bash
cd backend
cp .env.example .env
# edit .env: set MONGO_URI, JWT secrets, SMTP credentials, CLIENT_URL, etc.
npm install
npm run seed     # creates a sample university, admin user, and 2 communities
npm run dev      # starts the API on http://localhost:5000
```

### Environment variables (`.env`)

See `.env.example` for the full list. Key ones:

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string (Atlas `mongodb+srv://` in production) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Long random strings, **never commit real values** |
| `FRONTEND_URL` | Frontend origin(s) for CORS + email links — comma-separate if you need more than one (e.g. local dev + Vercel preview) |
| `COOKIE_SECURE` | Set `true` in production (HTTPS only cookies) |
| `SMTP_*` / `EMAIL_FROM` | Outbound email for verification/reset/2FA codes |
| `CAPTCHA_SECRET` | hCaptcha/reCAPTCHA secret — wire into the signup/login routes before going live with real users |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | File storage for resources and profile pictures |
| `MAX_UPLOAD_MB` | Upload size limit |
| `SENTRY_DSN` | Backend error monitoring — leave blank to disable |
| `PORT` | Render sets this dynamically in production; the app reads `process.env.PORT` and never hardcodes 5000 |

**Never commit `.env`.** It's already in `.gitignore`. Only `.env.example`
(placeholders only) should be committed.

### After seeding

The seed script prints an admin login (`admin@seecs.edu.pk` /
`ChangeMe123!`). **Change this password immediately** after your first
login in any real deployment. Admin accounts require email-OTP 2FA to log
in — check your configured SMTP inbox (or Mailtrap sandbox) for the code.

## Frontend setup

```bash
cd frontend
cp .env.example .env    # set VITE_API_BASE_URL to your backend URL
npm install
npm run dev               # starts the app on http://localhost:5173
```

Frontend env vars (`.env`): `VITE_API_BASE_URL` (required), `VITE_GA_MEASUREMENT_ID`
and `VITE_SENTRY_DSN` (both optional — each feature is fully disabled, with
no script loaded, when its var is unset).

## Security notes (Phase 1 — implemented, not deferred)

- Passwords hashed with bcrypt (10 salt rounds); never logged
- JWTs in httpOnly, secure (in prod) cookies — never localStorage
- Short-lived access tokens + refresh-token flow
- `tokenVersion` on `User` invalidates **all** sessions on password change /
  admin suspension / ban — not just the current session
- Rate limiting: tight limits on `/auth/*`, general limiter on the whole API
- Account lockout after 5 failed logins (15 min lock)
- Mandatory email verification before login
- Mandatory 2FA (email OTP) for moderator/admin accounts
- Input validation via `express-validator` on every mutating route
- `express-mongo-sanitize` blocks NoSQL injection via `$`/`.` operator stripping
- Explicit field allow-lists on every update (no raw `req.body` into
  `.create()`/`.update()` — prevents mass-assignment/role-escalation)
- User-generated content sanitized via `sanitize-html` before persistence
- `helmet` security headers, CORS locked to `CLIENT_URL` (never `*`)
- File uploads: MIME-type allow-list + size limit; **note:** production
  should add real magic-byte content sniffing (e.g. the `file-type`
  package) rather than trusting the client-reported MIME type alone
- Sensitive fields (`password`, tokens, OTP hashes) are `select: false` in
  the schema and never returned in API responses
- Privacy checks (blocking, `dmPermission`, community membership) enforced
  at the query level in controllers, not just hidden in the UI
- Security-relevant events logged to the `AuditLog` collection (failed
  logins, role changes, admin actions, bans)
- Password reset: single-use, 30-minute tokens; hash stored, raw token
  emailed; same generic response whether or not the email exists (no
  account enumeration)
- Account deletion (`DELETE /api/users/me`) genuinely anonymizes personal
  fields, not a soft flag

## Analytics, monitoring & legal pages

- **GA4**: loaded only after the person accepts the cookie-consent banner
  (`frontend/src/components/CookieConsent.jsx`), and only if
  `VITE_GA_MEASUREMENT_ID` is set. Custom events (`post_created`,
  `group_joined`, `resource_uploaded`, etc.) go through `trackEvent()` in
  `frontend/src/lib/analytics.js`.
- **Sentry**: initialized in both `backend/server.js` and
  `frontend/src/lib/sentry.js`, each fully disabled (no SDK network calls)
  when its DSN env var is unset.
- **Terms of Service / Privacy Policy**: static pages at `/terms` and
  `/privacy` with clearly marked `TODO` placeholder legal text — replace
  with reviewed copy before launch. Linked from the signup checkbox and the
  landing page footer.

### Still required before real students sign up

- **CAPTCHA**: hook `CAPTCHA_SECRET` into the signup/login controllers
  (verify the token from the frontend widget server-side) — scaffolded via
  the env var but not wired into the request flow in this repo yet
- **Automated backups**: configure daily automated backups + a documented
  restore process at the hosting/DB-provider level (e.g. MongoDB Atlas
  continuous backups) — this is infra configuration, not application code
- Run `npm audit` before every deploy and address findings

## Seed data

`npm run seed` (from `backend/`) creates:
- One active university: **NUST** (`seecs.edu.pk`, `nust.edu.pk` domains)
- One admin user: `admin@seecs.edu.pk`
- Two communities: `NUST General` and `SEECS - Computer Science`

Sign up as a student with any email ending in `@seecs.edu.pk` or
`@nust.edu.pk` to test the verified-signup flow end to end.

## Deployment

The app is built to deploy to this stack without rework: no hardcoded
`localhost` URLs, no hardcoded port, no local-disk file storage.

### 1. Database → MongoDB Atlas

1. Create a free (or paid) Atlas cluster.
2. Create a database user and allow-list the IPs you'll connect from (or
   `0.0.0.0/0` + Atlas's own network security if using Render's dynamic IPs —
   check Render's docs for their recommended approach, e.g. a static
   outbound IP add-on).
3. Copy the `mongodb+srv://...` connection string into `MONGO_URI`.
4. **Enable Atlas's automated daily backups** on the cluster (Atlas UI →
   Backup) and note the restore process in your team's runbook — this is
   infra configuration, not application code, but it's a Phase 1
   requirement, not optional.

### 2. Backend → Render

1. New Web Service → connect this repo → root directory `backend`.
2. Build command: `npm install`. Start command: `npm start`.
3. Add every variable from `backend/.env.example` in Render's Environment
   settings (Render assigns `PORT` itself — don't set it manually).
4. Set `FRONTEND_URL` to your Vercel deployment URL(s) once you have them
   (comma-separated if you keep a preview + production URL).
5. Set `COOKIE_SECURE=true` (Render serves over HTTPS).
6. After first deploy, run the seed script once via Render's shell tab (or
   a one-off job): `npm run seed`.

### 3. Frontend → Vercel

1. New Project → connect this repo → root directory `frontend`.
2. Vercel auto-detects the Vite build (`npm run build`, output `dist`).
3. Add `VITE_API_BASE_URL` (your Render backend URL + `/api`),
   `VITE_GA_MEASUREMENT_ID`, and `VITE_SENTRY_DSN` in Vercel's Environment
   Variables (the latter two optional).
4. Redeploy after adding env vars — Vite bakes them in at build time.

### 4. Post-deploy checklist

- [ ] Set up **UptimeRobot** (or similar) against `GET /api/health` on the
      Render backend — this is a manual, external step, not application code
- [ ] Confirm **GA4** is receiving data (Realtime report) if
      `VITE_GA_MEASUREMENT_ID` is set
- [ ] Confirm **Sentry** is catching errors on both frontend and backend
      (trigger a test error) if `SENTRY_DSN` / `VITE_SENTRY_DSN` are set
- [ ] Run `npm audit` in both `backend/` and `frontend/` and address findings
- [ ] Verify Atlas automated backups are enabled and you know the restore steps
- [ ] Replace the placeholder legal text in `/terms` and `/privacy` with
      reviewed copy before real students sign up
- [ ] Wire `CAPTCHA_SECRET` into the signup/login flow (see Security notes)

## What's out of scope for Phase 1

Cross-university discovery, course/professor reviews, marketplace,
ride-sharing, skill-swap/tutoring, alumni Q&A, payments, and push
notifications are intentionally not implemented — see the build spec for
the full Phase 2/3 roadmap.

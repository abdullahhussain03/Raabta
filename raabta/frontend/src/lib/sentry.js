import * as Sentry from '@sentry/react';

// No-op entirely if VITE_SENTRY_DSN isn't set — safe to call unconditionally
// from main.jsx in every environment, including local dev.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

// Google Analytics 4. Entirely gated behind VITE_GA_MEASUREMENT_ID so it's a
// no-op with no network calls at all when unset (e.g. local dev). Loading is
// also deferred until cookie consent is granted — see CookieConsent.jsx.
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let loaded = false;

export function loadGA() {
  if (!GA_ID || loaded) return;
  loaded = true;

  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments); // eslint-disable-line prefer-rest-params
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, { anonymize_ip: true });
}

// Custom event tracking for key in-app actions (signup completed, post
// created, group joined, etc). No-ops silently if GA was never loaded
// (either unset or consent not granted).
export function trackEvent(name, params = {}) {
  if (!window.gtag) return;
  window.gtag('event', name, params);
}

export const isAnalyticsConfigured = !!GA_ID;

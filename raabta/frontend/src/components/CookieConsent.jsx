import { useEffect, useState } from 'react';
import { loadGA, isAnalyticsConfigured } from '../lib/analytics';

const STORAGE_KEY = 'raabta_cookie_consent'; // 'granted' | 'declined'

// Shown on first visit only when analytics is actually configured — if
// VITE_GA_MEASUREMENT_ID is unset there's nothing to consent to, so the
// banner doesn't render at all.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAnalyticsConfigured) return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing === 'granted') {
      loadGA();
    } else if (!existing) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'granted');
    loadGA();
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-4 md:max-w-sm z-50 rounded-2xl border border-base-border bg-base-surface p-5 shadow-soft">
      <p className="text-sm text-white/70 mb-4">
        We use a required session cookie for login, and — only with your consent — Google
        Analytics to understand how Raabta is used. See our{' '}
        <a href="/privacy" className="text-brand-300 underline">Privacy Policy</a>.
      </p>
      <div className="flex gap-2">
        <button onClick={accept} className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 py-2 text-sm font-medium transition-colors">
          Accept
        </button>
        <button onClick={decline} className="flex-1 rounded-lg border border-base-border hover:bg-base-raised py-2 text-sm font-medium transition-colors">
          Decline
        </button>
      </div>
    </div>
  );
}

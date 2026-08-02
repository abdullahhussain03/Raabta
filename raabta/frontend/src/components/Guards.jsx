import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Second layer of SEO protection beyond robots.txt: injects a noindex meta
// tag whenever an authenticated page mounts, in case it's ever linked
// externally.
export function Noindex() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);
  return null;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <Noindex />
      {children}
    </>
  );
}

export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/feed" replace />;
  return (
    <>
      <Noindex />
      {children}
    </>
  );
}

export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base">
      <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}

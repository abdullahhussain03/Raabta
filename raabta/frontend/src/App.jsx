import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import LoginPage from './pages/LoginPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordResetPages';
import { TermsPage, PrivacyPage } from './pages/LegalPages';
import CookieConsent from './components/CookieConsent';
import { RequireAuth, RequireAdmin } from './components/Guards';
import AppShell from './components/AppShell';

// Pages below are stubs until built out in the next pass — kept as small
// inline placeholders so routing/guards can be wired and tested end-to-end
// now, then swapped for full implementations without touching App.jsx.
import FeedPage from './pages/FeedPage';
import CommunityPage from './pages/CommunityPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import ResourcesPage from './pages/ResourcesPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        <Route path="/feed" element={<RequireAuth><AppShell><FeedPage /></AppShell></RequireAuth>} />
        <Route path="/communities/:id" element={<RequireAuth><AppShell><CommunityPage /></AppShell></RequireAuth>} />
        <Route path="/groups" element={<RequireAuth><AppShell><GroupsPage /></AppShell></RequireAuth>} />
        <Route path="/groups/:id" element={<RequireAuth><AppShell><GroupDetailPage /></AppShell></RequireAuth>} />
        <Route path="/resources" element={<RequireAuth><AppShell><ResourcesPage /></AppShell></RequireAuth>} />
        <Route path="/messages" element={<RequireAuth><AppShell><MessagesPage /></AppShell></RequireAuth>} />
        <Route path="/profile/:id" element={<RequireAuth><AppShell><ProfilePage /></AppShell></RequireAuth>} />

        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
      </Routes>
      <CookieConsent />
    </>
  );
}

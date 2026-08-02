import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { AuthLayout } from './VerifyEmailPage';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } finally {
      setLoading(false);
      setSent(true); // always show the same generic confirmation
    }
  };

  return (
    <AuthLayout title="Reset your password">
      {sent ? (
        <p className="text-white/60 text-sm">
          If an account exists for <span className="text-white/90">{email}</span>, a reset link has
          been sent.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4 mt-4">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="University email"
          />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <Link to="/login" className="text-sm text-brand-300 mt-4 block">Back to log in</Link>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      navigate('/login', { state: { justVerified: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={submit} className="space-y-4 mt-4">
        <input
          required
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="input"
          placeholder="New password (min. 8 characters)"
        />
        {error && <p className="text-accent-rose text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Saving…' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}

import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { LogoWordmark } from '../components/Logo';

export default function VerifyEmailPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (!state?.userId) {
    return (
      <AuthLayout title="Verify your email">
        <p className="text-white/60 text-sm">
          We couldn&rsquo;t find a pending signup. Please{' '}
          <Link to="/signup" className="text-brand-300">sign up again</Link>.
        </p>
      </AuthLayout>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { userId: state.userId, code });
      navigate('/login', { state: { justVerified: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setInfo('');
    setError('');
    try {
      await api.post('/auth/resend-code', { userId: state.userId });
      setInfo('A new code has been sent.');
    } catch {
      setError('Could not resend code, please try again shortly.');
    }
  };

  return (
    <AuthLayout title="Verify your email">
      <p className="text-white/50 text-sm mb-6">
        Enter the 6-digit code sent to <span className="text-white/80">{state.email}</span>.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          required
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="input text-center tracking-[0.5em] text-lg"
          placeholder="000000"
        />
        {error && <p className="text-accent-rose text-sm">{error}</p>}
        {info && <p className="text-accent-teal text-sm">{info}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Verifying…' : 'Verify email'}
        </button>
      </form>
      <button onClick={resend} className="text-sm text-brand-300 mt-4">
        Resend code
      </button>
    </AuthLayout>
  );
}

export function AuthLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm card p-8">
        <LogoWordmark className="mb-6" />
        <h1 className="font-display text-2xl font-bold mb-1">{title}</h1>
        {children}
      </div>
    </div>
  );
}

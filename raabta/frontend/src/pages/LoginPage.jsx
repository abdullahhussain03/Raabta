import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from './VerifyEmailPage';

export default function LoginPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [otpStep, setOtpStep] = useState(null); // { userId } when 2FA required
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (data.requiresOtp) {
        setOtpStep({ userId: data.userId });
      } else {
        setUser(data.user);
        navigate('/feed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { userId: otpStep.userId, otp });
      setUser(data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect code.');
    } finally {
      setLoading(false);
    }
  };

  if (otpStep) {
    return (
      <AuthLayout title="Enter your code">
        <p className="text-white/50 text-sm mb-6">
          Moderator and admin accounts require a one-time code. Check your email.
        </p>
        <form onSubmit={submitOtp} className="space-y-4">
          <input
            required
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="input text-center tracking-[0.5em] text-lg"
            placeholder="000000"
          />
          {error && <p className="text-accent-rose text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Log in to Raabta">
      {state?.justVerified && (
        <p className="text-accent-teal text-sm mb-4">Email verified — you can log in now.</p>
      )}
      <form onSubmit={submit} className="space-y-4 mt-4">
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="input"
          placeholder="University email"
        />
        <input
          required
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="input"
          placeholder="Password"
        />
        {error && <p className="text-accent-rose text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <div className="flex items-center justify-between mt-4 text-sm">
        <Link to="/forgot-password" className="text-brand-300">Forgot password?</Link>
        <Link to="/signup" className="text-white/50">Create account</Link>
      </div>
    </AuthLayout>
  );
}

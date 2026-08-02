import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { LogoWordmark } from '../components/Logo';

export default function SignupPage() {
  const navigate = useNavigate();
  const [universities, setUniversities] = useState([]);
  const [form, setForm] = useState({ name: '', universityId: '', email: '', password: '' });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/universities').then(({ data }) => setUniversities(data.universities));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!agreed) return setError('Please agree to the Terms of Service and Community Guidelines.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      navigate('/verify-email', { state: { userId: data.userId, email: form.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl overflow-hidden border border-base-border shadow-soft">
        <div className="hidden md:flex flex-col justify-end p-10 bg-gradient-to-br from-brand-700 via-brand-500 to-accent-teal/70 min-h-[560px]">
          <h2 className="font-display text-3xl font-bold mb-3">Join the student community.</h2>
          <p className="text-white/80 text-sm">
            Verified access for students from NUST, FAST, LUMS, IBA, and 100+ other Pakistani
            universities.
          </p>
        </div>

        <div className="bg-base-surface p-8 md:p-10">
          <LogoWordmark className="mb-6" />
          <h1 className="font-display text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-white/50 text-sm mb-6">Join your university&rsquo;s verified network.</p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Full name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Haris Mehmood"
              />
            </Field>

            <Field label="Select university">
              <select
                required
                value={form.universityId}
                onChange={(e) => setForm({ ...form, universityId: e.target.value })}
                className="input"
              >
                <option value="">Choose your university&hellip;</option>
                {universities.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="University email address">
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="student.name@seecs.edu.pk"
              />
              <p className="text-xs text-white/40 mt-1.5">We&rsquo;ll send a verification code to this address.</p>
            </Field>

            <Field label="Password">
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input"
                placeholder="At least 8 characters"
              />
            </Field>

            <label className="flex items-start gap-2 text-xs text-white/50">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5"
              />
              I agree to the{' '}
              <Link to="/terms" target="_blank" className="text-brand-300 underline">Terms of Service</Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank" className="text-brand-300 underline">Privacy Policy</Link>.
            </label>

            {error && <p className="text-accent-rose text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 transition-colors py-3 font-medium disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Verify & Continue'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-300 font-medium">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide text-white/50 uppercase mb-1.5">{label}</label>
      {children}
    </div>
  );
}

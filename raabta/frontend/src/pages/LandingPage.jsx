import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, BookOpen, ArrowRight } from 'lucide-react';
import { LogoWordmark } from '../components/Logo';
import ParticleBackground from '../components/ParticleBackground';
import api from '../api/client';

const stats = [
  { label: 'Verified students', value: '2,000+' },
  { label: 'Active communities', value: '150+' },
  { label: 'Trust score', value: '4.9/5' },
];

const testimonials = [
  { quote: 'Found my study group for Data Structures within hours. Verification makes it feel safe to share files.', name: 'Ahmed R.', tag: 'CS, NUST' },
  { quote: 'The society pages helped me land an internship — real connections, not random social media.', name: 'Sana K.', tag: 'BS, LUMS' },
  { quote: 'Best place for past papers. Everything is organized by semester and course. Highly recommended.', name: 'Usman T.', tag: 'Eng, FAST' },
];

export default function LandingPage() {
  return (
    <div className="bg-base text-white">
      <header className="border-b border-base-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <LogoWordmark />
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#communities" className="hover:text-white">Communities</a>
            <a href="#resources" className="hover:text-white">Resources</a>
            <Link to="/login" className="hover:text-white">Log in</Link>
          </nav>
          <Link
            to="/signup"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            Join Now
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <ParticleBackground />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold tracking-widest text-brand-300 uppercase mb-4">
              NUST &middot; FAST &middot; LUMS &middot; GIKI &middot; IBA
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] mb-6">
              The verified network for
              <span className="text-brand-400"> Pakistani students</span>
            </h1>
            <p className="text-white/60 text-lg mb-8 max-w-md">
              Raabta means <em>connection</em> — join your campus community with your
              university email, share resources, and talk to real, verified students only.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 font-medium hover:bg-brand-600 transition-colors"
              >
                Join with University Email <ArrowRight size={16} />
              </Link>
              <a
                href="#request"
                className="inline-flex items-center justify-center rounded-xl border border-base-border px-6 py-3.5 font-medium text-white/80 hover:bg-base-surface transition-colors"
              >
                Request my university
              </a>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-base-border shadow-soft aspect-[4/3] bg-gradient-to-br from-brand-700 via-brand-500 to-accent-teal/60" />
        </div>

        <div className="mt-16 grid grid-cols-3 gap-4 max-w-xl">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-base-border bg-base-surface px-4 py-5 text-center">
              <div className="text-2xl font-display font-bold text-brand-300">{s.value}</div>
              <div className="text-xs text-white/50 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* Departmental communities */}
      <section id="communities" className="mx-auto max-w-7xl px-4 py-16 border-t border-base-border">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Departmental communities</h2>
        <p className="text-white/50 mb-8">Connect with peers from your faculty — moderated, on-topic, yours.</p>
        <div className="grid md:grid-cols-3 gap-5">
          {['CS Discussion Group', 'Business Society', 'Engineering Hub'].map((name, i) => (
            <div key={name} className="rounded-2xl border border-base-border bg-base-surface overflow-hidden shadow-card">
              <div className={`h-32 ${['bg-brand-500/30', 'bg-accent-teal/20', 'bg-accent-amber/20'][i]}`} />
              <div className="p-4">
                <p className="font-medium">{name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shared resources */}
      <section id="resources" className="mx-auto max-w-7xl px-4 py-16 border-t border-base-border grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-base-border bg-base-surface p-8">
          <BookOpen className="text-brand-400 mb-4" size={28} />
          <h3 className="font-display text-xl font-bold mb-2">Verified past papers</h3>
          <p className="text-white/50 text-sm">
            Download exam materials and notes shared exclusively by verified students across
            Pakistan&rsquo;s leading institutions.
          </p>
        </div>
        <div className="rounded-2xl border border-base-border bg-base-surface p-8">
          <Users className="text-accent-teal mb-4" size={28} />
          <h3 className="font-display text-xl font-bold mb-2">Study groups &amp; societies</h3>
          <p className="text-white/50 text-sm">
            Form groups for a course, a project, or a shared interest — chat, coordinate, and
            share files in one place.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 py-16 border-t border-base-border">
        <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">What students say</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-base-border bg-base-surface p-6">
              <blockquote className="text-white/70 text-sm leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="text-xs text-white/40">
                <span className="text-white/70 font-medium">{t.name}</span> &middot; {t.tag}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* University request / lead capture */}
      <section id="request" className="mx-auto max-w-7xl px-4 py-16 border-t border-base-border">
        <UniversityRequestForm />
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-14 text-center">
          <ShieldCheck className="mx-auto mb-4" size={32} />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Join your campus network</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto text-sm">
            Verification takes less than a minute. Only your university email is required.
          </p>
          <Link to="/signup" className="inline-block rounded-xl bg-white text-brand-700 px-6 py-3 font-semibold hover:bg-white/90 transition-colors">
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-base-border py-8 text-center text-xs text-white/40">
        <p className="mb-2">
          <Link to="/terms" className="hover:text-white/70">Terms of Service</Link>
          <span className="mx-2">&middot;</span>
          <Link to="/privacy" className="hover:text-white/70">Privacy Policy</Link>
        </p>
        &copy; {new Date().getFullYear()} Raabta. All members verified via university email.
      </footer>
    </div>
  );
}

function UniversityRequestForm() {
  return (
    <div className="rounded-2xl border border-base-border bg-base-surface p-8 max-w-2xl">
      <h2 className="font-display text-xl font-bold mb-1">Don&rsquo;t see your university?</h2>
      <p className="text-white/50 text-sm mb-6">
        This is a separate request — it doesn&rsquo;t create an account. We&rsquo;ll reach out once your
        school is onboarded.
      </p>
      <RequestFormFields />
    </div>
  );
}

function RequestFormFields() {
  const [form, setForm] = useState({ requesterName: '', requesterEmail: '', universityName: '' });
  const [status, setStatus] = useState('idle');

  const submit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/universities/request', form);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return <p className="text-accent-teal text-sm">Thanks! We&rsquo;ll be in touch once your university is available.</p>;
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
      <input
        required
        placeholder="Your name"
        value={form.requesterName}
        onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
        className="rounded-lg bg-base border border-base-border px-3 py-2.5 text-sm outline-none focus:border-brand-500"
      />
      <input
        required
        type="email"
        placeholder="Your email"
        value={form.requesterEmail}
        onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })}
        className="rounded-lg bg-base border border-base-border px-3 py-2.5 text-sm outline-none focus:border-brand-500"
      />
      <input
        required
        placeholder="University name"
        value={form.universityName}
        onChange={(e) => setForm({ ...form, universityName: e.target.value })}
        className="rounded-lg bg-base border border-base-border px-3 py-2.5 text-sm outline-none focus:border-brand-500"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="sm:col-span-3 rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {status === 'loading' ? 'Sending...' : 'Request my university'}
      </button>
      {status === 'error' && <p className="sm:col-span-3 text-accent-rose text-xs">Something went wrong — please try again.</p>}
    </form>
  );
}

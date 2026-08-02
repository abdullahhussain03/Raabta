import { Link } from 'react-router-dom';
import { LogoWordmark } from '../components/Logo';

function LegalLayout({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-base text-white">
      <header className="border-b border-base-border">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Link to="/">
            <LogoWordmark />
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold mb-2">{title}</h1>
        <p className="text-white/40 text-sm mb-10">Last updated: {updated}</p>
        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="TODO: set date on legal review">
      <Notice />
      <Section title="1. Acceptance of terms">
        By creating a Raabta account you agree to these Terms of Service and our Community
        Guidelines. TODO: replace with reviewed legal text covering eligibility, account
        ownership, and acceptable use specific to a Pakistani student platform.
      </Section>
      <Section title="2. Eligibility & verification">
        Raabta is restricted to students with a verified university email address. TODO:
        define consequences for account sharing, misrepresentation, or attempts to
        circumvent university-domain verification.
      </Section>
      <Section title="3. User content">
        You retain ownership of content you post but grant Raabta a license to display it
        within the platform. TODO: define takedown rights, anonymous-posting accountability
        (author identity is always retained server-side, see Privacy Policy), and DMCA-style
        process if applicable.
      </Section>
      <Section title="4. Prohibited conduct">
        TODO: list prohibited behavior — harassment, hate speech, academic dishonesty
        facilitation, impersonation, spam, and circumvention of moderation/blocking.
      </Section>
      <Section title="5. Moderation & enforcement">
        Raabta may warn, suspend, or ban accounts that violate these terms or Community
        Guidelines, and may remove content subject to a report. TODO: define appeal process.
      </Section>
      <Section title="6. Termination">
        You may delete your account at any time from your profile settings. TODO: define
        Raabta&rsquo;s right to terminate accounts and the effect of termination.
      </Section>
      <Section title="7. Disclaimers & limitation of liability">
        TODO: standard disclaimer and limitation-of-liability language, reviewed by counsel
        familiar with Pakistani law.
      </Section>
      <Section title="8. Changes to these terms">
        TODO: define notice period and process for material changes.
      </Section>
      <Section title="9. Contact">
        TODO: insert a real contact/support email once available.
      </Section>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="TODO: set date on legal review">
      <Notice />
      <Section title="1. What data we collect">
        Name, university email, university/program/year, profile details you choose to add
        (bio, interests, profile picture), posts/comments/messages you send, and uploaded
        course resources. TODO: confirm this list is exhaustive and add any analytics data
        collected via Google Analytics once enabled (see Cookie Notice below).
      </Section>
      <Section title="2. How we use it">
        To verify your student status, operate community/group/messaging features, enforce
        moderation and safety (see Report &amp; Block features), and — if enabled — to
        understand product usage in aggregate via Google Analytics. TODO: confirm no data is
        sold or shared with third parties beyond named service providers (email delivery,
        Cloudinary for file storage, Sentry for error monitoring, Google Analytics).
      </Section>
      <Section title="3. How long we retain it">
        TODO: define retention periods for account data, messages, uploaded resources, and
        audit logs after account deletion or inactivity.
      </Section>
      <Section title="4. Cookies & analytics">
        Raabta may use cookies for authentication (a required, first-party session cookie)
        and, if configured, Google Analytics to understand aggregate usage. You&rsquo;ll see a
        cookie notice on first visit if analytics cookies are enabled, and can decline
        non-essential cookies. TODO: finalize consent-banner copy and cookie table.
      </Section>
      <Section title="5. Account & data deletion">
        You can permanently delete your account from your profile settings. This
        anonymizes your personal data (name, email, bio, interests, profile picture) rather
        than simply hiding a flag. TODO: confirm handling of content you posted (e.g.
        resources, comments) after anonymization, and how long backups may retain deleted
        data before rotating out.
      </Section>
      <Section title="6. Your rights">
        TODO: list applicable data-subject rights and how to exercise them (access,
        correction, deletion, export).
      </Section>
      <Section title="7. Security">
        We use industry-standard practices (password hashing, encrypted transport,
        access controls) to protect your data. TODO: link to a security disclosure/contact
        process if one exists.
      </Section>
      <Section title="8. Contact">
        TODO: insert a real privacy contact email once available.
      </Section>
    </LegalLayout>
  );
}

function Notice() {
  return (
    <div className="rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-4 py-3 text-accent-amber text-xs mb-4">
      TODO: this page contains placeholder text only and has not been reviewed by legal
      counsel. Replace before real students rely on this platform.
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-white font-semibold text-lg mb-2">{title}</h2>
      <p>{children}</p>
    </section>
  );
}

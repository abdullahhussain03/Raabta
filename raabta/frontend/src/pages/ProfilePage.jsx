import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, ShieldOff } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { id } = useParams();
  const { user, setUser, refreshMe, logout } = useAuth();
  const navigate = useNavigate();
  const isOwn = id === 'me';

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [interestInput, setInterestInput] = useState('');

  useEffect(() => {
    if (isOwn) {
      setProfile(user);
      setForm({
        name: user?.name || '',
        program: user?.program || '',
        year: user?.year || '',
        bio: user?.bio || '',
        interests: user?.interests || [],
        dmPermission: user?.dmPermission || 'sameUniversity',
      });
    } else {
      api.get(`/users/${id}`).then(({ data }) => setProfile(data.user));
    }
  }, [id, isOwn, user]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/users/me', form);
      setUser(data.user);
    } finally {
      setSaving(false);
    }
  };

  const uploadPicture = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/users/me/profile-picture', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    await refreshMe();
  };

  const addInterest = () => {
    if (!interestInput.trim()) return;
    setForm((f) => ({ ...f, interests: [...f.interests, interestInput.trim()] }));
    setInterestInput('');
  };

  const deleteAccount = async () => {
    if (!confirm('This permanently deletes your account and personal data. Continue?')) return;
    await api.delete('/users/me');
    await logout();
    navigate('/');
  };

  if (!profile) return <p className="text-white/40 text-sm">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-xl font-semibold overflow-hidden">
              {profile.profilePicture ? (
                <img src={profile.profilePicture} alt={`${profile.name}'s profile picture`} className="h-full w-full object-cover" />
              ) : (
                profile.name?.[0]?.toUpperCase()
              )}
            </div>
            {isOwn && (
              <label className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-brand-500 flex items-center justify-center cursor-pointer">
                <Camera size={12} />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && uploadPicture(e.target.files[0])} />
              </label>
            )}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{profile.name}</h1>
            <p className="text-sm text-white/50">{profile.university?.name || profile.university?.shortName}</p>
          </div>
        </div>

        {isOwn && form ? (
          <form onSubmit={save} className="space-y-4">
            <FieldRow label="Name">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FieldRow>
            <FieldRow label="Program / Degree">
              <input className="input" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} />
            </FieldRow>
            <FieldRow label="Year / Semester">
              <input className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </FieldRow>
            <FieldRow label="Bio">
              <textarea className="input min-h-[80px]" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </FieldRow>
            <FieldRow label="Interests">
              <div className="flex flex-wrap gap-2 mb-2">
                {form.interests.map((int, i) => (
                  <span key={i} className="text-xs rounded-full bg-base-raised px-3 py-1 flex items-center gap-1.5">
                    {int}
                    <button type="button" onClick={() => setForm((f) => ({ ...f, interests: f.interests.filter((_, idx) => idx !== i) }))} className="text-white/40 hover:text-white">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input" value={interestInput} onChange={(e) => setInterestInput(e.target.value)} placeholder="Add an interest" />
                <button type="button" onClick={addInterest} className="btn-secondary px-4">Add</button>
              </div>
            </FieldRow>
            <FieldRow label="Who can message you">
              <select className="input" value={form.dmPermission} onChange={(e) => setForm({ ...form, dmPermission: e.target.value })}>
                <option value="everyone">Everyone</option>
                <option value="sameUniversity">Same university only</option>
                <option value="nobody">Nobody</option>
              </select>
            </FieldRow>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            {profile.program && <p><span className="text-white/40">Program:</span> {profile.program}</p>}
            {profile.year && <p><span className="text-white/40">Year:</span> {profile.year}</p>}
            {profile.bio && <p className="text-white/70">{profile.bio}</p>}
            {!!profile.interests?.length && (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.interests.map((int, i) => (
                  <span key={i} className="text-xs rounded-full bg-base-raised px-3 py-1">{int}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isOwn && (
        <div className="card p-6 border-accent-rose/20">
          <h2 className="font-semibold text-accent-rose flex items-center gap-2 mb-2"><ShieldOff size={16} /> Danger zone</h2>
          <p className="text-sm text-white/50 mb-3">Permanently delete your account and anonymize your personal data.</p>
          <button onClick={deleteAccount} className="rounded-xl border border-accent-rose/40 text-accent-rose px-4 py-2 text-sm hover:bg-accent-rose/10">
            Delete my account
          </button>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide text-white/50 uppercase mb-1.5">{label}</label>
      {children}
    </div>
  );
}

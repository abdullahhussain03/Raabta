import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus, Users } from 'lucide-react';
import api from '../api/client';
import { trackEvent } from '../lib/analytics';
import GroupAvatar from '../components/GroupAvatar';
import { MAX_IMAGE_MB } from '../lib/uploadLimits';
import { EmptyState } from './FeedPage';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => api.get('/groups').then(({ data }) => { setGroups(data.groups); setLoading(false); });

  useEffect(() => { load(); }, []);

  // Auto-dismiss feedback banners.
  useEffect(() => {
    if (!error && !notice) return;
    const t = setTimeout(() => { setError(''); setNotice(''); }, 4000);
    return () => clearTimeout(t);
  }, [error, notice]);

  const join = async (g) => {
    setError('');
    setNotice('');
    setJoiningId(g._id);
    try {
      await api.post(`/groups/${g._id}/join`);
      trackEvent('group_joined', { group_id: g._id });
      // Optimistic flip + server refetch, so the Joined state is immediate
      // and also persists across a refresh (isMember comes from the API).
      setGroups((prev) => prev.map((x) => (x._id === g._id ? { ...x, isMember: true } : x)));
      setNotice(`You joined “${g.name}”.`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not join the group. Please try again.');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold">Groups</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> Create group
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-accent-rose/40 bg-accent-rose/10 px-4 py-2.5 text-sm text-accent-rose">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-accent-teal/40 bg-accent-teal/10 px-4 py-2.5 text-sm text-accent-teal">
          {notice}
        </div>
      )}

      {loading ? (
        <p className="text-white/40 text-sm">Loading…</p>
      ) : groups.length === 0 ? (
        <EmptyState message="No groups yet — start one!" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g._id} className="card p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <GroupAvatar group={g} size={44} />
                <div className="min-w-0">
                  <p className="text-xs text-brand-300 font-medium uppercase tracking-wide">{g.category}</p>
                  <h3 className="font-semibold leading-tight truncate">{g.name}</h3>
                  <p className="text-xs text-white/40">{g.memberCount ?? 0} members</p>
                </div>
              </div>
              <p className="text-sm text-white/50 mb-4 line-clamp-3 flex-1">{g.description}</p>
              <div className="flex items-center justify-between">
                <Link to={`/groups/${g._id}`} className="text-sm text-brand-300">View</Link>
                {g.isMember ? (
                  <span className="text-xs rounded-lg border border-accent-teal/40 bg-accent-teal/10 text-accent-teal px-3 py-1.5 flex items-center gap-1">
                    <Check size={13} /> Joined
                  </span>
                ) : (
                  <button
                    onClick={() => join(g)}
                    disabled={joiningId === g._id}
                    className="text-xs rounded-lg border border-base-border px-3 py-1.5 hover:bg-base-raised flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joiningId === g._id ? (
                      <span className="flex items-center gap-1"><Users size={13} /> Joining…</span>
                    ) : (
                      <span className="flex items-center gap-1"><Users size={13} /> Join</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateGroupModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', category: '' });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Revoke the preview object URL when it changes or the modal unmounts.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    setError('');
    if (!f) return;
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Group photos are limited to ${MAX_IMAGE_MB}MB.`);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      let payload = form;
      if (file) {
        payload = new FormData();
        Object.entries(form).forEach(([k, v]) => payload.append(k, v));
        payload.append('file', file);
      }
      await api.post('/groups', payload);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create group.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg mb-4">Create a group</h3>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-4">
            {previewUrl ? (
              <img src={previewUrl} alt="Group photo preview" className="h-16 w-16 rounded-full object-cover border border-base-border" />
            ) : (
              <GroupAvatar group={{ name: 'Group' }} size={64} />
            )}
            <label className="text-xs text-white/50 hover:text-brand-300 cursor-pointer">
              Add group photo (optional)
              <input type="file" accept="image/*" className="hidden" onChange={pickFile} />
            </label>
          </div>
          <input required placeholder="Group name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          <input required placeholder="Category (e.g. Study Group, Sports)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
          <textarea required minLength={10} placeholder="What's this group about?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[90px]" />
          {error && <p className="text-accent-rose text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating…' : 'Create'}</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

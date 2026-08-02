import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import api from '../api/client';
import { trackEvent } from '../lib/analytics';
import { EmptyState } from './FeedPage';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/groups').then(({ data }) => { setGroups(data.groups); setLoading(false); });

  useEffect(() => { load(); }, []);

  const join = async (id) => {
    await api.post(`/groups/${id}/join`);
    trackEvent('group_joined', { group_id: id });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-xl font-bold">Groups</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> Create group
        </button>
      </div>

      {loading ? (
        <p className="text-white/40 text-sm">Loading…</p>
      ) : groups.length === 0 ? (
        <EmptyState message="No groups yet — start one!" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div key={g._id} className="card p-5 flex flex-col">
              <p className="text-xs text-brand-300 font-medium mb-1 uppercase tracking-wide">{g.category}</p>
              <h3 className="font-semibold mb-1">{g.name}</h3>
              <p className="text-sm text-white/50 mb-4 line-clamp-3 flex-1">{g.description}</p>
              <div className="flex items-center justify-between">
                <Link to={`/groups/${g._id}`} className="text-sm text-brand-300">View</Link>
                <button onClick={() => join(g._id)} className="text-xs rounded-lg border border-base-border px-3 py-1.5 hover:bg-base-raised flex items-center gap-1">
                  <Users size={13} /> Join
                </button>
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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/groups', form);
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

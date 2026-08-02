import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Building2, Users2, Flag, UserCog } from 'lucide-react';
import api from '../api/client';
import { LogoWordmark } from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'universities', label: 'Universities', icon: Building2 },
  { key: 'communities', label: 'Communities', icon: Users2 },
  { key: 'moderation', label: 'Moderation Queue', icon: Flag },
  { key: 'users', label: 'User Management', icon: UserCog },
];

export default function AdminPage() {
  const [tab, setTab] = useState('universities');
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-base">
      <header className="border-b border-base-border">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoWordmark />
            <span className="text-xs rounded-full bg-brand-500/15 text-brand-300 px-2.5 py-1 flex items-center gap-1">
              <Shield size={11} /> Admin
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/feed" className="text-white/50 hover:text-white">Back to app</Link>
            <button onClick={logout} className="text-white/50 hover:text-white">Log out</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-left ${
                tab === key ? 'bg-brand-500/15 text-brand-300 font-medium' : 'text-white/60 hover:bg-base-surface'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div>
          {tab === 'universities' && <UniversitiesTab />}
          {tab === 'communities' && <CommunitiesTab />}
          {tab === 'moderation' && <ModerationTab />}
          {tab === 'users' && <UsersTab />}
        </div>
      </div>
    </div>
  );
}

// --- Universities ---
function UniversitiesTab() {
  const [universities, setUniversities] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ name: '', shortName: '', verifiedEmailDomains: '', status: 'active' });

  const load = () => {
    api.get('/universities/admin/all').then(({ data }) => setUniversities(data.universities));
    api.get('/universities/admin/requests').then(({ data }) => setRequests(data.requests));
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/universities/admin', {
      ...form,
      verifiedEmailDomains: form.verifiedEmailDomains.split(',').map((d) => d.trim()).filter(Boolean),
    });
    setForm({ name: '', shortName: '', verifiedEmailDomains: '', status: 'active' });
    load();
  };

  const toggleStatus = async (u) => {
    await api.patch(`/universities/admin/${u._id}`, { status: u.status === 'active' ? 'pending' : 'active' });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Add a university</h2>
        <form onSubmit={create} className="grid sm:grid-cols-2 gap-3">
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          <input required placeholder="Short name (e.g. NUST)" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} className="input" />
          <input required placeholder="Email domains, comma separated" value={form.verifiedEmailDomains} onChange={(e) => setForm({ ...form, verifiedEmailDomains: e.target.value })} className="input sm:col-span-2" />
          <button type="submit" className="btn-primary sm:col-span-2">Create university</button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">All universities</h2>
        <div className="space-y-2">
          {universities.map((u) => (
            <div key={u._id} className="flex items-center justify-between rounded-lg border border-base-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-white/40">{u.verifiedEmailDomains.join(', ')}</p>
              </div>
              <button onClick={() => toggleStatus(u)} className={`text-xs rounded-full px-3 py-1 ${u.status === 'active' ? 'bg-accent-teal/15 text-accent-teal' : 'bg-white/10 text-white/50'}`}>
                {u.status}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4">University requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-white/40">No pending requests.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r._id} className="rounded-lg border border-base-border px-4 py-3 text-sm">
                <p className="font-medium">{r.universityName}</p>
                <p className="text-white/40 text-xs">{r.requesterName} &middot; {r.requesterEmail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Communities ---
function CommunitiesTab() {
  const [universities, setUniversities] = useState([]);
  const [selectedUni, setSelectedUni] = useState('');
  const [communities, setCommunities] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', type: 'department', description: '', isVerifiedOfficial: false });

  useEffect(() => { api.get('/universities/admin/all').then(({ data }) => setUniversities(data.universities)); }, []);

  const loadCommunities = (uniId) => {
    if (!uniId) return;
    api.get(`/communities/university/${uniId}`).then(({ data }) => setCommunities(data.communities));
  };

  useEffect(() => { loadCommunities(selectedUni); }, [selectedUni]);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/communities/admin', { ...form, universityId: selectedUni });
    setForm({ name: '', slug: '', type: 'department', description: '', isVerifiedOfficial: false });
    loadCommunities(selectedUni);
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Select a university</h2>
        <select className="input" value={selectedUni} onChange={(e) => setSelectedUni(e.target.value)}>
          <option value="">Choose…</option>
          {universities.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
      </div>

      {selectedUni && (
        <>
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Create a community</h2>
            <form onSubmit={create} className="grid sm:grid-cols-2 gap-3">
              <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
              <input required placeholder="Slug (e.g. seecs-cs)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" />
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="department">Department</option>
                <option value="society">Society</option>
                <option value="batch">Batch</option>
                <option value="general">General</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-white/60">
                <input type="checkbox" checked={form.isVerifiedOfficial} onChange={(e) => setForm({ ...form, isVerifiedOfficial: e.target.checked })} />
                Verified official
              </label>
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input sm:col-span-2" />
              <button type="submit" className="btn-primary sm:col-span-2">Create community</button>
            </form>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-4">Communities</h2>
            <div className="space-y-2">
              {communities.map((c) => (
                <div key={c._id} className="rounded-lg border border-base-border px-4 py-3 text-sm flex items-center justify-between">
                  <span>{c.name} <span className="text-white/30 text-xs">({c.type})</span></span>
                  {c.isVerifiedOfficial && <span className="text-[10px] text-accent-teal">Official</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Moderation queue ---
function ModerationTab() {
  const [reports, setReports] = useState([]);
  const load = () => api.get('/reports/queue').then(({ data }) => setReports(data.reports));
  useEffect(() => { load(); }, []);

  const action = async (id, action) => {
    await api.patch(`/reports/${id}/action`, { action });
    load();
  };

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-4">Pending reports</h2>
      {reports.length === 0 ? (
        <p className="text-sm text-white/40">Queue is empty.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r._id} className="rounded-lg border border-base-border p-4">
              <p className="text-sm"><span className="text-white/40">Type:</span> {r.reportedContentType}</p>
              <p className="text-sm mb-2"><span className="text-white/40">Reason:</span> {r.reason}</p>
              <p className="text-xs text-white/30 mb-3">Reported by {r.reportedBy?.name}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => action(r._id, 'dismiss')} className="text-xs btn-secondary">Dismiss</button>
                <button onClick={() => action(r._id, 'remove_content')} className="text-xs btn-secondary">Remove content</button>
                <button onClick={() => action(r._id, 'warn_user')} className="text-xs btn-secondary">Warn user</button>
                <button onClick={() => action(r._id, 'suspend_user')} className="text-xs btn-secondary">Suspend user</button>
                <button onClick={() => action(r._id, 'ban_user')} className="text-xs rounded-xl border border-accent-rose/40 text-accent-rose px-4 py-2">Ban user</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- User management ---
function UsersTab() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [communityId, setCommunityId] = useState('');

  const search = () => api.get('/admin/users', { params: { q } }).then(({ data }) => setUsers(data.users));
  useEffect(() => { search(); }, []); // eslint-disable-line

  const verify = async (id) => { await api.post(`/admin/users/${id}/verify`); search(); };
  const promote = async (id) => {
    if (!communityId) return alert('Enter a community ID to scope this promotion to.');
    await api.post(`/admin/users/${id}/promote-moderator`, { communityId });
    search();
  };

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-4">Search users</h2>
      <div className="flex gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" className="input" />
        <button onClick={search} className="btn-secondary">Search</button>
      </div>
      <input value={communityId} onChange={(e) => setCommunityId(e.target.value)} placeholder="Community ID to scope moderator promotion" className="input mb-4" />
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u._id} className="rounded-lg border border-base-border px-4 py-3 flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">{u.name} <span className="text-white/30 text-xs">({u.role})</span></p>
              <p className="text-white/40 text-xs">{u.email} &middot; {u.isEmailVerified ? 'verified' : 'unverified'} &middot; {u.accountStatus}</p>
            </div>
            <div className="flex gap-2">
              {!u.isEmailVerified && <button onClick={() => verify(u._id)} className="text-xs btn-secondary">Verify</button>}
              <button onClick={() => promote(u._id)} className="text-xs btn-secondary">Promote to mod</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

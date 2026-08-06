import { useEffect, useState } from 'react';
import { Search, Upload, Download, FileText } from 'lucide-react';
import api from '../api/client';
import { trackEvent } from '../lib/analytics';
import { MAX_DOC_MB } from '../lib/uploadLimits';
import { EmptyState } from './FeedPage';

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [courseCode, setCourseCode] = useState('');
  const [q, setQ] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/resources', { params: { courseCode: courseCode || undefined, q: q || undefined } })
      .then(({ data }) => { setResources(data.resources); setLoading(false); });
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async (r) => {
    const { data } = await api.get(`/resources/${r._id}/download`);
    window.open(data.url, '_blank', 'noopener');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h1 className="font-display text-xl font-bold">Academic Hub</h1>
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-1.5">
          <Upload size={16} /> Upload resource
        </button>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); load(); }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            placeholder="Search by course code (e.g. CS201)…"
            className="input pl-9"
          />
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keyword…" className="input sm:max-w-xs" />
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {loading ? (
        <p className="text-white/40 text-sm">Loading…</p>
      ) : resources.length === 0 ? (
        <EmptyState message="No resources found." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <div key={r._id} className="card p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-brand-300" />
                <span className="text-xs font-semibold text-brand-300">{r.courseCode}</span>
              </div>
              <h3 className="font-medium text-sm mb-1">{r.courseName}</h3>
              {r.description && <p className="text-xs text-white/50 mb-3 line-clamp-2 flex-1">{r.description}</p>}
              <div className="flex items-center justify-between text-xs text-white/40 mt-auto pt-2">
                <span>{r.downloadCount} downloads</span>
                <button onClick={() => download(r)} className="flex items-center gap-1 text-brand-300">
                  <Download size={13} /> Get
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUploaded={() => { setShowUpload(false); load(); }} />
      )}
    </div>
  );
}

function UploadModal({ onClose, onUploaded }) {
  const [form, setForm] = useState({ courseCode: '', courseName: '', description: '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please choose a file.');
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      return setError(`Files are limited to ${MAX_DOC_MB}MB on the current Cloudinary plan.`);
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('file', file);
      await api.post('/resources', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      trackEvent('resource_uploaded', { course_code: form.courseCode });
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-lg mb-4">Upload a resource</h3>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Course code (e.g. CS201)" value={form.courseCode} onChange={(e) => setForm({ ...form, courseCode: e.target.value })} className="input" />
          <input required placeholder="Course name" value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} className="input" />
          <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[70px]" />
          <input required type="file" accept=".pdf,.docx,.pptx,image/*" onChange={(e) => setFile(e.target.files[0])} className="input" />
          <p className="text-xs text-white/40">PDF, DOCX, PPTX, or images — up to {MAX_DOC_MB}MB.</p>
          {error && <p className="text-accent-rose text-sm">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Uploading…' : 'Upload'}</button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

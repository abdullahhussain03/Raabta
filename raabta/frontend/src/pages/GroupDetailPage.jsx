import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, Send } from 'lucide-react';
import api from '../api/client';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import GroupAvatar from '../components/GroupAvatar';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../components/PostCard';
import { MAX_IMAGE_MB } from '../lib/uploadLimits';
import { EmptyState } from './FeedPage';

const POLL_MS = 4000;

export default function GroupDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [tab, setTab] = useState('feed');
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get(`/groups/${id}`).then(({ data }) => setGroup(data.group));
    api.get(`/posts/group/${id}`).then(({ data }) => setPosts(data.posts));
  }, [id]);

  const isMember = group?.members?.some((m) => (m._id || m) === user?.id);

  return (
    <div>
      {group && (
        <div className="mb-5 flex items-start gap-4">
          <div className="relative shrink-0">
            <GroupAvatar group={group} size={64} />
            {isMember && (
              <ChangeDpButton group={group} onChanged={(g) => setGroup(g)} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-brand-300 font-medium uppercase tracking-wide mb-1">{group.category}</p>
            <h1 className="font-display text-xl font-bold mb-1">{group.name}</h1>
            <p className="text-sm text-white/50">{group.description}</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-5 border-b border-base-border">
        {['feed', 'chat'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px ${tab === t ? 'border-brand-500 text-white' : 'border-transparent text-white/40'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'feed' ? (
        <div>
          {isMember && <PostComposer groupId={id} onCreated={(p) => setPosts((prev) => [p, ...prev])} />}
          {posts.length === 0 ? (
            <EmptyState message="No posts yet in this group." />
          ) : (
            <div className="space-y-4">
              {posts.map((p) => <PostCard key={p._id} post={p} onChanged={() => api.get(`/posts/group/${id}`).then(({ data }) => setPosts(data.posts))} />)}
            </div>
          )}
        </div>
      ) : (
        <GroupChat groupId={id} isMember={isMember} />
      )}
    </div>
  );
}

// Overlay button on the group avatar: opens a file picker (members only)
// and uploads the new photo via POST /groups/:id/dp.
function ChangeDpButton({ group, onChanged }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Group photos are limited to ${MAX_IMAGE_MB}MB.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/groups/${group._id}/dp`, fd);
      onChanged(data.group);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the group photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute -bottom-1.5 -right-1.5">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Change group photo"
        aria-label="Change group photo"
        className="h-8 w-8 rounded-full bg-base-surface border border-base-border text-white/70 hover:text-white hover:bg-base-raised flex items-center justify-center disabled:opacity-50"
      >
        <Camera size={14} />
      </button>
      {error && (
        <p className="absolute right-0 top-9 w-48 text-right text-[11px] text-accent-rose">{error}</p>
      )}
    </div>
  );
}

function GroupChat({ groupId, isMember }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const lastTimestamp = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    let interval;
    const poll = async () => {
      const params = lastTimestamp.current ? { after: lastTimestamp.current } : {};
      const { data } = await api.get(`/groups/${groupId}/messages`, { params });
      if (data.messages.length) {
        setMessages((prev) => [...prev, ...data.messages]);
        lastTimestamp.current = data.messages[data.messages.length - 1].createdAt;
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    poll();
    // Simple polling loop for MVP group chat — see backend/models/GroupMessage.js
    // for the tradeoff note on why this isn't WebSocket-based yet.
    interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [groupId]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const { data } = await api.post(`/groups/${groupId}/messages`, { content: text });
    setMessages((prev) => [...prev, data.message]);
    lastTimestamp.current = data.message.createdAt;
    setText('');
  };

  if (!isMember) {
    return <EmptyState message="Join this group to view and send messages." />;
  }

  return (
    <div className="card flex flex-col h-[520px]">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {messages.map((m) => {
          const mine = (m.sender?._id || m.sender) === user?.id;
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-brand-500 text-white' : 'bg-base-raised text-white/80'}`}>
                {!mine && <p className="text-[11px] text-white/40 mb-0.5">{m.sender?.name}</p>}
                {m.content}
                <p className="text-[10px] opacity-50 mt-1">{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 p-3 border-t border-base-border">
        <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="Message the group…" />
        <button type="submit" className="btn-primary px-3.5"><Send size={16} /></button>
      </form>
    </div>
  );
}

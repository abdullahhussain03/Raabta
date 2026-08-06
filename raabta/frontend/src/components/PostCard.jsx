import { useState } from 'react';
import { ArrowUp, MessageCircle, Pin, Flag, MoreHorizontal } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function PostCard({ post, onChanged }) {
  const { user } = useAuth();
  const [upvoted, setUpvoted] = useState(post.upvotes?.some((u) => (u._id || u) === user?.id));
  const [count, setCount] = useState(post.upvotes?.length || 0);
  const [showReport, setShowReport] = useState(false);

  const author = post.author || {};
  const canModerate = user?.role === 'admin' ||
    (user?.role === 'moderator' && post.community);

  const toggleUpvote = async () => {
    setUpvoted((v) => !v);
    setCount((c) => (upvoted ? c - 1 : c + 1));
    try {
      await api.post(`/posts/${post._id}/upvote`);
    } catch {
      // revert on failure
      setUpvoted((v) => !v);
      setCount((c) => (upvoted ? c + 1 : c - 1));
    }
  };

  const togglePin = async () => {
    await api.post(`/posts/${post._id}/pin`);
    onChanged?.();
  };

  const remove = async () => {
    if (!confirm('Remove this post?')) return;
    await api.delete(`/posts/${post._id}`);
    onChanged?.();
  };

  return (
    <article className={`card p-5 ${post.isPinned ? 'border-brand-500/40 bg-brand-500/5' : ''}`}>
      {post.isPinned && (
        <div className="flex items-center gap-1.5 text-xs text-brand-300 font-medium mb-3">
          <Pin size={12} /> Pinned
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-xs font-semibold shrink-0">
            {author.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-medium">{author.name || 'Anonymous'}</p>
            <p className="text-xs text-white/40">{timeAgo(post.createdAt)}</p>
          </div>
        </div>
        <div className="relative">
          <PostMenu
            canModerate={canModerate}
            isOwner={author._id === user?.id}
            onPin={togglePin}
            onRemove={remove}
            onReport={() => setShowReport(true)}
          />
        </div>
      </div>

      {post.content && <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed mb-4">{post.content}</p>}

      {post.mediaUrl && post.mediaType === 'video' ? (
        <video
          src={post.mediaUrl}
          controls
          preload="metadata"
          className="rounded-xl w-full max-h-[420px] object-contain bg-black/40 mb-4"
        />
      ) : post.mediaUrl ? (
        <img
          src={post.mediaUrl}
          alt=""
          loading="lazy"
          className="rounded-xl w-full max-h-[420px] object-cover mb-4"
        />
      ) : null}

      <div className="flex items-center gap-5 text-white/50 text-sm">
        <button onClick={toggleUpvote} className={`flex items-center gap-1.5 ${upvoted ? 'text-brand-300' : 'hover:text-white'}`}>
          <ArrowUp size={16} /> {count}
        </button>
        <span className="flex items-center gap-1.5">
          <MessageCircle size={16} /> {post.commentCount || 0}
        </span>
      </div>

      {showReport && <ReportModal contentType="post" contentId={post._id} onClose={() => setShowReport(false)} />}
    </article>
  );
}

function PostMenu({ canModerate, isOwner, onPin, onRemove, onReport }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="text-white/40 hover:text-white">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 card p-1.5 z-10">
          <MenuItem icon={Flag} label="Report" onClick={() => { onReport(); setOpen(false); }} />
          {canModerate && <MenuItem icon={Pin} label="Pin / Unpin" onClick={() => { onPin(); setOpen(false); }} />}
          {(canModerate || isOwner) && (
            <MenuItem label="Remove" danger onClick={() => { onRemove(); setOpen(false); }} />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left hover:bg-base-raised ${danger ? 'text-accent-rose' : 'text-white/70'}`}
    >
      {Icon && <Icon size={13} />} {label}
    </button>
  );
}

export function ReportModal({ contentType, contentId, onClose }) {
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/reports', { reportedContentType: contentType, reportedContentId: contentId, reason });
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold mb-3">Report this {contentType}</h3>
        {sent ? (
          <p className="text-accent-teal text-sm">Thanks — our moderation team will review this.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input min-h-[90px]"
              placeholder="What's wrong with this content?"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">Submit report</button>
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

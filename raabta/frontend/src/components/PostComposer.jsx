import { useState } from 'react';
import api from '../api/client';
import { trackEvent } from '../lib/analytics';

export default function PostComposer({ communityId, groupId, onCreated }) {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post('/posts', { content, communityId, groupId, isAnonymous });
      setContent('');
      setIsAnonymous(false);
      trackEvent('post_created', { has_community: !!communityId, has_group: !!groupId });
      onCreated?.(data.post);
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-4 mb-5">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something with your campus…"
        className="input min-h-[70px] resize-none"
        maxLength={5000}
      />
      <div className="flex items-center justify-between mt-3">
        <label className="flex items-center gap-2 text-xs text-white/50">
          <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
          Post anonymously
        </label>
        <button type="submit" disabled={posting || !content.trim()} className="btn-primary">
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}

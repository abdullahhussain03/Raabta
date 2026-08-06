import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Video as VideoIcon, X } from 'lucide-react';
import api from '../api/client';
import { trackEvent } from '../lib/analytics';
import { MAX_IMAGE_MB, MAX_VIDEO_MB } from '../lib/uploadLimits';

export default function PostComposer({ communityId, groupId, onCreated }) {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [media, setMedia] = useState(null);         // selected File
  const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
  const [previewUrl, setPreviewUrl] = useState('');
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Revoke the object URL whenever the preview is replaced/unmounted.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const pickFile = (file, type) => {
    setError('');
    if (!file) return;
    const maxMb = type === 'video' ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > maxMb * 1024 * 1024) {
      setError(`${type === 'video' ? 'Videos' : 'Images'} are limited to ${maxMb}MB on the current plan.`);
      return;
    }
    setMedia(file);
    setMediaType(type);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMedia(null);
    setMediaType(null);
    setPreviewUrl('');
  };

  const canSubmit = (content.trim() || media) && !posting;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setPosting(true);
    setError('');
    try {
      let payload;
      if (media) {
        payload = new FormData();
        payload.append('content', content);
        payload.append('isAnonymous', String(isAnonymous));
        if (communityId) payload.append('communityId', communityId);
        if (groupId) payload.append('groupId', groupId);
        payload.append('media', media);
      } else {
        payload = { content, communityId, groupId, isAnonymous };
      }
      const { data } = await api.post('/posts', payload);
      setContent('');
      setIsAnonymous(false);
      clearMedia();
      trackEvent('post_created', { has_community: !!communityId, has_group: !!groupId, has_media: !!media });
      onCreated?.(data.post);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create the post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-4 mb-5">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={media ? 'Say something about this…' : 'Share something with your campus…'}
        className="input min-h-[70px] resize-none"
        maxLength={5000}
      />

      {previewUrl && (
        <div className="relative mt-3 inline-block">
          {mediaType === 'video' ? (
            <video src={previewUrl} controls className="max-h-56 rounded-xl bg-black/40" />
          ) : (
            <img src={previewUrl} alt="Attachment preview" className="max-h-56 rounded-xl object-cover" />
          )}
          <button
            type="button"
            onClick={clearMedia}
            className="absolute -top-2 -right-2 rounded-full bg-black/70 border border-base-border p-1 hover:bg-black text-white"
            aria-label="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { pickFile(e.target.files?.[0], 'image'); e.target.value = ''; }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={posting}
              className="text-xs text-white/50 hover:text-brand-300 flex items-center gap-1 disabled:opacity-40"
            >
              <ImageIcon size={15} /> Photo
            </button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { pickFile(e.target.files?.[0], 'video'); e.target.value = ''; }}
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={posting}
              className="text-xs text-white/50 hover:text-brand-300 flex items-center gap-1 disabled:opacity-40"
            >
              <VideoIcon size={15} /> Video
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/50">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
            Post anonymously
          </label>
        </div>
        <button type="submit" disabled={!canSubmit} className="btn-primary">
          {posting ? (media ? 'Uploading…' : 'Posting…') : 'Post'}
        </button>
      </div>

      <p className="text-[11px] text-white/30 mt-2">Images up to {MAX_IMAGE_MB}MB · Videos up to {MAX_VIDEO_MB}MB.</p>
      {error && <p className="text-accent-rose text-sm mt-2">{error}</p>}
    </form>
  );
}

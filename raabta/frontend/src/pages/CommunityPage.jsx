import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import { EmptyState, SkeletonList } from './FeedPage';

export default function CommunityPage() {
  const { id } = useParams();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get(`/posts/community/${id}`).then(({ data }) => {
      setPosts(data.posts);
      setLoading(false);
    });
  };

  useEffect(() => {
    api.get(`/communities/${id}`).then(({ data }) => setCommunity(data.community));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div>
        {community && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-xl font-bold">{community.name}</h1>
              {community.isVerifiedOfficial && (
                <span className="text-[10px] rounded-full bg-accent-teal/15 text-accent-teal px-2 py-0.5">Official</span>
              )}
            </div>
            <p className="text-sm text-white/50">{community.description}</p>
          </div>
        )}

        <PostComposer communityId={id} onCreated={(p) => setPosts((prev) => [p, ...prev])} />

        {loading ? (
          <SkeletonList />
        ) : posts.length === 0 ? (
          <EmptyState message="No posts here yet." />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} onChanged={load} />
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">About</p>
          <p className="text-sm text-white/60">{community?.description}</p>
        </div>
        {!!community?.moderators?.length && (
          <div className="card p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">Moderators</p>
            <div className="space-y-2">
              {community.moderators.map((m) => (
                <div key={m._id} className="flex items-center gap-2 text-sm text-white/70">
                  <div className="h-7 w-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  {m.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

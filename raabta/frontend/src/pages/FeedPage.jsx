import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';

export default function FeedPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [activeCommunity, setActiveCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/communities/mine').then(({ data }) => {
      setCommunities(data.communities);
      const general = data.communities.find((c) => c.type === 'general') || data.communities[0];
      setActiveCommunity(general || null);
    });
  }, []);

  useEffect(() => {
    if (!activeCommunity) return;
    setLoading(true);
    api.get(`/posts/community/${activeCommunity._id}`).then(({ data }) => {
      setPosts(data.posts);
      setLoading(false);
    });
  }, [activeCommunity]);

  return (
    <div className="grid lg:grid-cols-[1fr_260px] gap-6">
      <div>
        <h1 className="font-display text-xl font-bold mb-4">
          {activeCommunity ? activeCommunity.name : 'Home Feed'}
        </h1>

        {activeCommunity && (
          <PostComposer communityId={activeCommunity._id} onCreated={(p) => setPosts((prev) => [p, ...prev])} />
        )}

        {loading ? (
          <SkeletonList />
        ) : posts.length === 0 ? (
          <EmptyState message="No posts yet — be the first to share something." />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} onChanged={() => api.get(`/posts/community/${activeCommunity._id}`).then(({ data }) => setPosts(data.posts))} />
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-3">My Communities</p>
          <div className="space-y-1">
            {communities.map((c) => (
              <button
                key={c._id}
                onClick={() => setActiveCommunity(c)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm flex items-center justify-between ${
                  activeCommunity?._id === c._id ? 'bg-brand-500/15 text-brand-300' : 'text-white/70 hover:bg-base-raised'
                }`}
              >
                {c.name}
                {c.isVerifiedOfficial && <span className="text-[10px] text-accent-teal">Official</span>}
              </button>
            ))}
          </div>
        </div>
        <Link to="/resources" className="card p-4 block text-sm text-white/70 hover:bg-base-raised">
          📄 Browse course resources
        </Link>
        <Link to="/groups" className="card p-4 block text-sm text-white/70 hover:bg-base-raised">
          👥 Discover groups
        </Link>
      </aside>
    </div>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="card p-10 text-center text-white/40 text-sm">{message}</div>
  );
}

export function SkeletonList() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="h-4 w-32 bg-base-raised rounded mb-3" />
          <div className="h-3 w-full bg-base-raised rounded mb-2" />
          <div className="h-3 w-2/3 bg-base-raised rounded" />
        </div>
      ))}
    </div>
  );
}

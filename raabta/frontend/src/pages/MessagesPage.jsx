import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../components/PostCard';
import { EmptyState } from './FeedPage';

export default function MessagesPage() {
  const [tab, setTab] = useState('messages'); // 'messages' | 'requests'
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [active, setActive] = useState(null);

  const load = () => api.get('/dm/conversations').then(({ data }) => {
    setRequests(data.requests);
    setMessages(data.messages);
  });

  useEffect(() => { load(); }, []);

  const list = tab === 'messages' ? messages : requests;

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-5 h-[calc(100vh-140px)]">
      <div className="card overflow-hidden flex flex-col">
        <div className="flex border-b border-base-border">
          {['messages', 'requests'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm capitalize ${tab === t ? 'text-brand-300 border-b-2 border-brand-500' : 'text-white/40'}`}
            >
              {t} {t === 'requests' && requests.length > 0 && <span className="ml-1 text-[10px] bg-brand-500 rounded-full px-1.5">{requests.length}</span>}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {list.length === 0 ? (
            <p className="text-white/40 text-sm p-4">Nothing here yet.</p>
          ) : (
            list.map((c) => <ConversationRow key={c._id} conversation={c} active={active?._id === c._id} onClick={() => setActive(c)} />)
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {active ? (
          <ChatView conversation={active} onAccepted={load} />
        ) : (
          <div className="h-full flex items-center justify-center text-white/30 text-sm">Select a conversation</div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({ conversation, active, onClick }) {
  const { user } = useAuth();
  const other = conversation.participants.find((p) => p._id !== user?.id) || conversation.participants[0];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-base-border/60 ${active ? 'bg-base-raised' : 'hover:bg-base-raised/50'}`}
    >
      <div className="h-9 w-9 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-semibold shrink-0">
        {other?.name?.[0]?.toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{other?.name}</p>
        <p className="text-xs text-white/40 truncate">{conversation.lastMessagePreview || 'No messages yet'}</p>
      </div>
    </button>
  );
}

function ChatView({ conversation, onAccepted }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);
  const other = conversation.participants.find((p) => p._id !== user?.id) || conversation.participants[0];
  const isPendingForMe = conversation.status === 'pending' && conversation.initiatedBy !== user?.id;

  useEffect(() => {
    api.get(`/dm/conversations/${conversation._id}/messages`).then(({ data }) => {
      setMessages(data.messages);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    });
  }, [conversation._id]);

  const accept = async () => {
    await api.post(`/dm/conversations/${conversation._id}/accept`);
    onAccepted();
  };

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const { data } = await api.post(`/dm/conversations/${conversation._id}/messages`, { content: text });
    setMessages((prev) => [...prev, data.message]);
    setText('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-base-border flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-semibold">
          {other?.name?.[0]?.toUpperCase()}
        </div>
        <p className="font-medium text-sm">{other?.name}</p>
      </div>

      {isPendingForMe && (
        <div className="px-4 py-3 bg-brand-500/10 border-b border-base-border flex items-center justify-between">
          <p className="text-xs text-white/60">This is a message request.</p>
          <button onClick={accept} className="text-xs rounded-lg bg-brand-500 px-3 py-1.5">Accept</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {messages.map((m) => {
          const mine = m.sender === user?.id || m.sender?._id === user?.id;
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-brand-500' : 'bg-base-raised text-white/80'}`}>
                {m.content}
                <p className="text-[10px] opacity-50 mt-1">{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 p-3 border-t border-base-border">
        <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="Type a message…" />
        <button type="submit" className="btn-primary px-3.5"><Send size={16} /></button>
      </form>
    </div>
  );
}

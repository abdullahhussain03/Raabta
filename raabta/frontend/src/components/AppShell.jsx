import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, Users, FolderOpen, MessageSquare, User, Shield, LogOut } from 'lucide-react';
import { LogoWordmark } from './Logo';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/feed', label: 'Home Feed', icon: Home },
  { to: '/groups', label: 'Groups', icon: Users },
  { to: '/resources', label: 'Resources', icon: FolderOpen },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-base">
      <header className="sticky top-0 z-20 border-b border-base-border bg-base/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/feed">
            <LogoWordmark />
          </Link>
          <div className="flex items-center gap-4">
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-base-border px-3 py-1.5 text-sm text-white/80 hover:bg-base-raised"
              >
                <Shield size={15} /> Admin
              </Link>
            )}
            <Link to="/profile/me" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-brand-500/30 border border-brand-500/50 flex items-center justify-center text-xs font-semibold">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="sticky top-20 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-500/15 text-brand-300 font-medium'
                      : 'text-white/60 hover:bg-base-surface hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-base-border bg-base-surface flex justify-around py-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `flex flex-col items-center gap-0.5 text-[11px] ${isActive ? 'text-brand-300' : 'text-white/50'}`}
          >
            <Icon size={20} />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

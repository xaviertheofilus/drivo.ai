import React from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Home, Users2, Clock, Settings, LogOut, Mic, BarChart3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fileUrl } from '@/lib/api';

const NAV = [
  { to: '/dashboard', key: 'nav.home', icon: Home, testId: 'nav-home' },
  { to: '/personas', key: 'nav.personas', icon: Users2, testId: 'nav-personas' },
  { to: '/history', key: 'nav.history', icon: Clock, testId: 'nav-history' },
  { to: '/settings', key: 'nav.settings', icon: Settings, testId: 'nav-settings' },
  { to: '/analysis', key: 'nav.analysis', icon: BarChart3, testId: 'nav-analysis' },
];

export function AppLayout({ children }) {
  const { user, logout, t } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  // Hide chrome on /session
  const isSession = loc.pathname.startsWith('/session') && !loc.pathname.includes('/report');
  if (isSession) return <div className="min-h-screen" style={{ background: 'var(--bg)' }}>{children}</div>;

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r" style={{ borderColor: 'var(--border)', background: 'rgba(18,18,26,0.6)' }}>
        <Link to="/dashboard" className="px-5 py-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md grid place-items-center" style={{ background: 'var(--primary)' }}>
            <Mic className="h-4 w-4" style={{ color: 'var(--bg)' }} />
          </div>
          <span className="font-display text-xl">DrivoAI</span>
        </Link>
        <nav className="flex-1 px-3">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={n.testId}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 h-11 rounded-md text-sm transition-colors ${
                    isActive ? 'bg-white/5 text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)] hover:bg-white/5 hover:text-[color:var(--text-primary)]'
                  }`
                }
              >
                <Icon className="h-4 w-4" /> {t(n.key)}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.avatar_file_id ? fileUrl(user.avatar_file_id) : undefined} />
              <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{(user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{user?.full_name || t('common.driver')}</p>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
            <button data-testid="nav-logout" onClick={async () => { await logout(); navigate('/login'); }} className="p-2 rounded-md hover:bg-white/10" aria-label={t('common.logout')}>
              <LogOut className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b" style={{ borderColor: 'var(--border)' }}>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md grid place-items-center" style={{ background: 'var(--primary)' }}>
              <Mic className="h-3.5 w-3.5" style={{ color: 'var(--bg)' }} />
            </div>
            <span className="font-display text-lg">DrivoAI</span>
          </Link>
          <Avatar className="h-8 w-8" onClick={() => navigate('/settings')} role="button">
            <AvatarImage src={user?.avatar_file_id ? fileUrl(user.avatar_file_id) : undefined} />
            <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{(user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {children}
        </div>
        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t backdrop-blur z-40 pb-[env(safe-area-inset-bottom)]" style={{ borderColor: 'var(--border)', background: 'rgba(10,10,15,0.85)' }}>
          <div className="grid grid-cols-4">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <NavLink key={n.to} to={n.to} data-testid={`${n.testId}-mobile`} className={({ isActive }) => `flex flex-col items-center gap-1 py-2 text-[11px] ${isActive ? 'text-[color:var(--primary)]' : 'text-[color:var(--text-secondary)]'}`}>
                  <Icon className="h-4 w-4" />
                  {t(n.key)}
                </NavLink>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

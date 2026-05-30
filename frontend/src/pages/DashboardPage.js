import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { api, fileUrl, avatarSeedUrl } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, Sparkles, Mic, Clock, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: active, mutate: mutateActive } = useSWR('/personas/active', fetcher);
  const { data: sessions } = useSWR('/sessions', fetcher);
  const [language, setLanguage] = useState(user?.language || 'en');
  const [starting, setStarting] = useState(false);

  useEffect(() => { if (user?.language) setLanguage(user.language); }, [user]);

  const startSession = async (withPersona) => {
    setStarting(true);
    try {
      const payload = { language };
      if (withPersona && active?.id) payload.persona_id = active.id;
      const { data } = await api.post('/sessions', payload);
      localStorage.setItem('drivoai_active_session', JSON.stringify(data));
      navigate('/session');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not start session');
    } finally {
      setStarting(false);
    }
  };

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const recent = (sessions || []).slice(0, 5);

  return (
    <div className="pb-24 md:pb-0">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] font-mono" style={{ color: 'var(--primary)' }}>Dashboard</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">{greet()}, {user?.full_name || 'driver'}.</h1>
          <p className="text-sm mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} data-testid="dashboard-language-toggle">
          <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded text-xs font-mono ${language === 'en' ? '' : 'opacity-50'}`} style={{ background: language === 'en' ? 'var(--primary)' : 'transparent', color: language === 'en' ? 'var(--bg)' : 'var(--text-secondary)' }}>EN</button>
          <button onClick={() => setLanguage('id')} className={`px-2 py-1 rounded text-xs font-mono ${language === 'id' ? '' : 'opacity-50'}`} style={{ background: language === 'id' ? 'var(--primary)' : 'transparent', color: language === 'id' ? 'var(--bg)' : 'var(--text-secondary)' }}>ID</button>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-4">
        {/* Active persona */}
        <div className="lg:col-span-2 card-surface p-6 sm:p-8">
          <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Active Persona</p>
          {active ? (
            <div className="mt-4 flex items-start gap-5">
              <Avatar className="h-16 w-16 border" style={{ borderColor: 'var(--border)' }}>
                <AvatarImage src={active.avatar_file_id ? fileUrl(active.avatar_file_id) : avatarSeedUrl(active.avatar_seed || active.slug || active.id)} />
                <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{(active.name || 'AI').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-3xl leading-tight">{active.name}</h2>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(active.tone_tags || []).slice(0, 4).map((t) => (
                    <Badge key={t} variant="outline" className="font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{t}</Badge>
                  ))}
                </div>
                <p className="text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>{(active.personality_summary || '').slice(0, 180)}…</p>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>You haven't set a persona yet.</p>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              data-testid="dashboard-start-session-button"
              onClick={() => startSession(true)}
              disabled={starting || !active}
              className="h-14 px-6 text-base glow-primary"
              style={{ background: 'var(--primary)', color: 'var(--bg)' }}
            >
              {starting ? 'Starting…' : (
                <span className="flex items-center gap-2">
                  Start Session <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
            <Button asChild variant="outline" className="h-14 px-6 text-base" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }} data-testid="dashboard-change-persona-link">
              <Link to="/personas">{active ? 'Change Persona' : 'Choose Persona'}</Link>
            </Button>
          </div>
        </div>

        {/* Talk first */}
        <div className="card-surface p-6">
          <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--accent)' }}>Talk first</p>
          <h3 className="font-display text-2xl mt-2">No persona? Just talk.</h3>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            Let DrivoAI learn your style from this conversation — you'll get a tailored persona suggestion at the end.
          </p>
          <Button
            data-testid="dashboard-start-unassigned-button"
            onClick={() => startSession(false)}
            disabled={starting}
            variant="outline"
            className="mt-5 w-full h-12"
            style={{ background: 'transparent', borderColor: 'var(--border)' }}
          >
            Start Unassigned Session
          </Button>
        </div>
      </div>

      {/* Recent drives */}
      <div className="mt-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Recent Drives</p>
            <h3 className="font-display text-2xl mt-1">Last few sessions</h3>
          </div>
          <Link to="/history" className="text-sm" style={{ color: 'var(--primary)' }} data-testid="dashboard-view-history-link">View all</Link>
        </div>
        <div className="mt-4 card-surface overflow-hidden">
          {recent.length === 0 && (
            <div className="p-10 text-center">
              <Mic className="mx-auto h-8 w-8 mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No drives yet. Start one to see it here.</p>
            </div>
          )}
          {recent.length > 0 && (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {recent.map((s) => (
                <Link
                  key={s.id}
                  to={`/session/${s.id}/report`}
                  data-testid={`dashboard-session-row-${s.id}`}
                  className="grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-white/5 transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="col-span-12 sm:col-span-3 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{new Date(s.started_at).toLocaleString()}</div>
                  <div className="col-span-6 sm:col-span-2 text-sm flex items-center gap-1" style={{ color: 'var(--text-primary)' }}><Clock className="h-3.5 w-3.5" /> {s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : '–'}</div>
                  <div className="col-span-6 sm:col-span-3 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{s.persona_snapshot?.name || 'Unassigned'}</div>
                  <div className="col-span-6 sm:col-span-2 text-sm font-mono" style={{ color: 'var(--accent)' }}>{s.engagement_score ?? '–'}</div>
                  <div className="col-span-6 sm:col-span-2 text-sm flex items-center gap-1 font-mono" style={{ color: (s.drowsiness_flags || []).length ? 'var(--warning)' : 'var(--text-secondary)' }}>
                    <ShieldAlert className="h-3.5 w-3.5" /> {(s.drowsiness_flags || []).length}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

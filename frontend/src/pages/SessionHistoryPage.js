import React from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Clock, ShieldAlert, Activity, Mic } from 'lucide-react';

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function SessionHistoryPage() {
  const { data: sessions } = useSWR('/sessions', fetcher);

  return (
    <div className="pb-24 md:pb-0">
      <p className="text-xs uppercase tracking-[0.25em] font-mono" style={{ color: 'var(--primary)' }}>History</p>
      <h1 className="font-display text-3xl sm:text-4xl mt-2">All your drives</h1>
      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Tap any session to open its report.</p>

      <div className="mt-8 card-surface overflow-hidden">
        {!sessions && <div className="p-10 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>}
        {sessions && sessions.length === 0 && (
          <div className="p-12 text-center">
            <Mic className="mx-auto h-8 w-8 mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No drives yet. Start a session from the dashboard.</p>
          </div>
        )}
        {sessions && sessions.length > 0 && (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {sessions.map((s) => (
              <Link
                key={s.id}
                to={`/session/${s.id}/report`}
                className="grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-white/5 transition-colors"
                data-testid={`history-row-${s.id}`}
              >
                <div className="col-span-12 sm:col-span-3">
                  <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>{new Date(s.started_at).toLocaleString()}</p>
                  <Badge variant="outline" className="mt-1 text-[10px] font-mono" style={{ borderColor: 'var(--border)', color: s.status === 'completed' ? 'var(--accent)' : 'var(--warning)' }}>{s.status}</Badge>
                </div>
                <div className="col-span-6 sm:col-span-3 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{s.persona_snapshot?.name || 'Unassigned'}</div>
                <div className="col-span-6 sm:col-span-2 flex items-center gap-1 text-sm" style={{ color: 'var(--text-primary)' }}><Clock className="h-3.5 w-3.5" /><span className="font-mono">{s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : '–'}</span></div>
                <div className="col-span-6 sm:col-span-2 flex items-center gap-1 text-sm" style={{ color: 'var(--accent)' }}><Activity className="h-3.5 w-3.5" /><span className="font-mono">{s.engagement_score ?? '–'}</span></div>
                <div className="col-span-6 sm:col-span-2 flex items-center gap-1 text-sm font-mono" style={{ color: (s.drowsiness_flags || []).length ? 'var(--warning)' : 'var(--text-secondary)' }}>
                  <ShieldAlert className="h-3.5 w-3.5" /> {(s.drowsiness_flags || []).length} flags
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

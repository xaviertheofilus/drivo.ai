import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceArea, Tooltip } from 'recharts';
import { ChevronLeft, Activity, Smile, Clock, ShieldAlert, Sparkles, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function SessionReportPage() {
  const { id } = useParams();
  const { data, mutate, isLoading } = useSWR(`/sessions/${id}/report`, fetcher, { refreshInterval: 3000 });
  const { data: turns } = useSWR(`/sessions/${id}/turns`, fetcher);
  const [acceptingAuto, setAcceptingAuto] = useState(false);

  const session = data?.session;
  const report = data?.report;
  const autoDraft = data?.auto_persona_draft;

  // Stop refreshing once report is ready
  useEffect(() => {
    if (report) {
      const t = setTimeout(() => mutate(), 0);
      return () => clearTimeout(t);
    }
  }, [report, mutate]);

  const runAnalysisNow = async () => {
    try {
      await api.post(`/sessions/${id}/run-analysis`);
      mutate();
    } catch (e) {
      toast.error('Analysis failed');
    }
  };

  const acceptAuto = async () => {
    setAcceptingAuto(true);
    try {
      await api.post(`/sessions/${id}/accept-auto-persona`);
      toast.success('Auto-persona activated');
      mutate();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not accept');
    } finally {
      setAcceptingAuto(false);
    }
  };

  if (isLoading && !data) return <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>;
  if (!session) return <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Not found.</div>;

  const flags = report?.drowsiness_flags || session.drowsiness_flags || [];
  const timeline = report?.drowsiness_timeline || [];
  const minutes = session.duration_seconds ? Math.round(session.duration_seconds / 60) : 0;
  const personaName = session.persona_snapshot?.name || 'Unassigned';

  return (
    <div className="pb-24 md:pb-0">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }} data-testid="report-back-link">
        <ChevronLeft className="h-3.5 w-3.5" /> Dashboard
      </Link>
      <div className="mt-4 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] font-mono" style={{ color: 'var(--primary)' }}>Drive report</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">Session debrief</h1>
          <p className="text-sm mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>{new Date(session.started_at).toLocaleString()} · {minutes}m · {personaName}</p>
        </div>
        {!report && (
          <Button onClick={runAnalysisNow} variant="outline" className="h-11" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}><RefreshCcw className="h-4 w-4 mr-2" /> Run analysis</Button>
        )}
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Engagement" value={report?.engagement_score ?? '–'} subtext="0–100" color="var(--primary)" testId="report-engagement" />
        <StatCard icon={Smile} label="Tone" value={report?.emotional_tone || '–'} subtext="overall" color="var(--accent)" testId="report-tone" />
        <StatCard icon={Clock} label="Turns" value={report?.total_turns ?? 0} subtext="exchanges" color="var(--text-primary)" testId="report-turns" />
        <StatCard icon={ShieldAlert} label="Drowsiness" value={flags.length} subtext={`${flags.filter((f) => f.severity === 'high').length} high`} color={flags.length ? 'var(--warning)' : 'var(--text-primary)'} testId="report-flags" />
      </div>

      {/* Topics */}
      <div className="mt-8 card-surface p-6">
        <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Topics</p>
        <div className="mt-3 flex flex-wrap gap-2" data-testid="report-topics">
          {(report?.topics || []).length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyzing…</p>}
          {(report?.topics || []).map((t, i) => (
            <Badge key={i} variant="outline" className="font-mono text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>{t}</Badge>
          ))}
        </div>
        {report?.summary && <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>{report.summary}</p>}
      </div>

      {/* Drowsiness timeline */}
      {timeline.length > 0 && (
        <div className="mt-6 card-surface p-6">
          <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Drowsiness timeline</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 10, right: 16, bottom: 0, left: -16 }}>
                <XAxis dataKey="turn" stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" tick={{ fill: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontSize: 11 }} />
                <ReferenceArea y1={70} y2={90} fill="rgba(247,184,79,0.15)" />
                <ReferenceArea y1={90} y2={100} fill="rgba(247,95,95,0.18)" />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Auto-persona draft */}
      {autoDraft && (
        <div className="mt-6 card-surface p-6" style={{ borderColor: 'rgba(127,224,176,0.35)' }} data-testid="report-auto-persona">
          <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--accent)' }}>Auto-persona recommendation</p>
          <h3 className="font-display text-2xl mt-1">We drafted a companion from this drive</h3>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{autoDraft.personality_summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(autoDraft.tone_tags || []).map((t) => <Badge key={t} variant="outline" className="font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{t}</Badge>)}
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button onClick={acceptAuto} disabled={acceptingAuto} className="h-11 glow-primary" style={{ background: 'var(--primary)', color: 'var(--bg)' }} data-testid="report-accept-auto-button"><Sparkles className="h-4 w-4 mr-2" /> Save & Activate</Button>
            <Button variant="ghost" className="h-11">Discard</Button>
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="mt-6 card-surface p-6">
        <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Transcript</p>
        <Accordion type="single" collapsible className="mt-2">
          <AccordionItem value="transcript" className="border-0">
            <AccordionTrigger className="py-3 text-sm hover:no-underline" data-testid="report-transcript-toggle">View {(turns || []).length} turns</AccordionTrigger>
            <AccordionContent>
              <div className="mt-2 space-y-3" data-testid="report-transcript">
                {(turns || []).map((t) => (
                  <div key={t.id} className="flex gap-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest pt-1 w-12" style={{ color: t.speaker === 'ai' ? 'var(--primary)' : 'var(--accent)' }}>{t.speaker === 'ai' ? 'AI' : 'You'}</div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.content}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(t.timestamp).toLocaleTimeString()}{t.drowsiness_score != null ? `  ·  drowsy ${t.drowsiness_score}` : ''}</p>
                    </div>
                  </div>
                ))}
                {(turns || []).length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No turns recorded.</p>}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color, testId }) {
  return (
    <div className="card-surface p-5" data-testid={testId}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="font-mono text-3xl mt-3 tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{subtext}</p>
    </div>
  );
}

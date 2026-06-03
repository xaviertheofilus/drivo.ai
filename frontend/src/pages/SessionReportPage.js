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
import { useAuth } from '@/lib/AuthContext';

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function SessionReportPage() {
  const { id } = useParams();
  const { t } = useAuth();
  const { data, mutate, isLoading } = useSWR(`/sessions/${id}/report`, fetcher, { refreshInterval: 3000 });
  const { data: turns } = useSWR(`/sessions/${id}/turns`, fetcher);
  const [acceptingAuto, setAcceptingAuto] = useState(false);

  const session = data?.session;
  const report = data?.report;
  const autoDraft = data?.auto_persona_draft;

  // Stop refreshing once report is ready
  useEffect(() => {
    if (report) {
      const tid = setTimeout(() => mutate(), 0);
      return () => clearTimeout(tid);
    }
  }, [report, mutate]);

  const runAnalysisNow = async () => {
    try {
      await api.post(`/sessions/${id}/run-analysis`);
      mutate();
    } catch (e) {
      toast.error(t('report.analysisFailed'));
    }
  };

  const acceptAuto = async () => {
    setAcceptingAuto(true);
    try {
      await api.post(`/sessions/${id}/accept-auto-persona`);
      toast.success(t('report.autoActivated'));
      mutate();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t('report.couldNotAccept'));
    } finally {
      setAcceptingAuto(false);
    }
  };

  if (isLoading && !data) return <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('report.loading')}</div>;
  if (!session) return <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('report.notFound')}</div>;

  const flags = report?.drowsiness_flags || session.drowsiness_flags || [];
  const timeline = report?.drowsiness_timeline || [];
  const minutes = session.duration_seconds ? Math.round(session.duration_seconds / 60) : 0;
  const personaName = session.persona_snapshot?.name || t('historyPage.unassigned');

  return (
    <div className="pb-24 lg:pb-0">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }} data-testid="report-back-link">
        <ChevronLeft className="h-3.5 w-3.5" /> {t('report.backToDashboard')}
      </Link>
      <div className="mt-4 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] font-mono" style={{ color: 'var(--primary)' }}>{t('report.driveReport')}</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">{t('report.sessionDebrief')}</h1>
          <p className="text-sm mt-2 font-mono" style={{ color: 'var(--text-muted)' }}>{new Date(session.started_at).toLocaleString()} · {minutes}m · {personaName}</p>
        </div>
        {!report && (
          <Button onClick={runAnalysisNow} variant="outline" className="h-11" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}><RefreshCcw className="h-4 w-4 mr-2" /> {t('report.runAnalysis')}</Button>
        )}
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label={t('report.stats.engagement')} value={report?.engagement_score ?? '–'} subtext="0–100" color="var(--primary)" testId="report-engagement" />
        <StatCard icon={Smile} label={t('report.stats.tone')} value={report?.emotional_tone || '–'} subtext={t('report.stats.overall')} color="var(--accent)" testId="report-tone" />
        <StatCard icon={Clock} label={t('report.stats.turns')} value={report?.total_turns ?? 0} subtext={t('report.stats.exchanges')} color="var(--text-primary)" testId="report-turns" />
        <StatCard icon={ShieldAlert} label={t('report.stats.drowsiness')} value={flags.length} subtext={t('report.stats.high', flags.filter((f) => f.severity === 'high').length)} color={flags.length ? 'var(--warning)' : 'var(--text-primary)'} testId="report-flags" />
      </div>

      {/* Topics */}
      <div className="mt-8 card-surface p-6">
        <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('report.topics')}</p>
        <div className="mt-3 flex flex-wrap gap-2" data-testid="report-topics">
          {(report?.topics || []).length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('report.analyzing')}</p>}
          {(report?.topics || []).map((topic, i) => (
            <Badge key={`${topic}-${i}`} variant="outline" className="font-mono text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>{topic}</Badge>
          ))}
        </div>
        {report?.summary && <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>{report.summary}</p>}
      </div>

      {/* Drowsiness timeline */}
      {timeline.length > 0 && (
        <div className="mt-6 card-surface p-6">
          <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('report.drowsinessTimeline')}</p>
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
          <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--accent)' }}>{t('report.autoRecommendation')}</p>
          <h3 className="font-display text-2xl mt-1">{t('report.draftedFromDrive')}</h3>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{autoDraft.personality_summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(autoDraft.tone_tags || []).map((t) => <Badge key={t} variant="outline" className="font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{t}</Badge>)}
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            <Button onClick={acceptAuto} disabled={acceptingAuto} className="h-11 glow-primary" style={{ background: 'var(--primary)', color: 'var(--bg)' }} data-testid="report-accept-auto-button"><Sparkles className="h-4 w-4 mr-2" /> {t('personaPreview.saveActivate')}</Button>
            <Button variant="ghost" className="h-11">{t('report.discard')}</Button>
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="mt-6 card-surface p-6">
        <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('report.transcript')}</p>
        <Accordion type="single" collapsible className="mt-2">
          <AccordionItem value="transcript" className="border-0">
            <AccordionTrigger className="py-3 text-sm hover:no-underline" data-testid="report-transcript-toggle">{t('report.viewTurns', (turns || []).length)}</AccordionTrigger>
            <AccordionContent>
              <div className="mt-2 space-y-3" data-testid="report-transcript">
                {(turns || []).map((turn) => (
                  <div key={turn.id} className="flex gap-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest pt-1 w-12" style={{ color: turn.speaker === 'ai' ? 'var(--primary)' : 'var(--accent)' }}>{turn.speaker === 'ai' ? 'AI' : t('report.you')}</div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{turn.content}</p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(turn.timestamp).toLocaleTimeString()}{turn.drowsiness_score != null ? `  ·  drowsy ${turn.drowsiness_score}` : ''}</p>
                    </div>
                  </div>
                ))}
                {(turns || []).length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('report.noTurns')}</p>}
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

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Calendar, TrendingUp, Clock, Zap, DollarSign, Users, MessageSquare, Mic, Volume2, Activity } from 'lucide-react';
import { toast } from 'sonner';

function MetricCard({ title, value, subtitle, icon: Icon, color = 'var(--primary)', className = '' }) {
  return (
    <div className={`p-4 rounded-lg border bg-surface-alt border-border ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
        {Icon && <Icon className="h-4 w-4" style={{ color }} />}
      </div>
      <p className="text-2xl font-display" style={{ color }}>{value}</p>
      {subtitle && <p className="text-[10px] mt-1 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ChartCard({ title, base64Image }) {
  return (
    <div className="p-4 rounded-lg border bg-surface-alt border-border">
      <p className="text-xs uppercase tracking-widest font-mono mb-3" style={{ color: 'var(--text-secondary)' }}>{title}</p>
      {base64Image ? (
        <img src={`data:image/png;base64,${base64Image}`} alt={title} className="w-full h-auto rounded" />
      ) : (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No data</div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const { t } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;
      const { data } = await api.get('/analytics', { params });
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const a = analyticsData || {};
  
  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] font-mono" style={{ color: 'var(--primary)' }}>{t('nav.analysis')}</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">Usage Analysis</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Real-time visualization of platform metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 p-2 rounded-md border" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}>
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="h-8 text-xs border-none bg-transparent w-28" />
            <span className="text-muted-foreground">-</span>
            <Input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="h-8 text-xs border-none bg-transparent w-28" />
          </div>
          <Button onClick={fetchAnalytics} size="sm" disabled={loading} style={{ background: 'var(--primary)', color: 'var(--bg)' }}>
            Apply
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard title="Total Users" value={a.total_users || 0} icon={Users} color="#F75F5F" />
            <MetricCard title="Total Queries" value={a.total_queries || 0} icon={MessageSquare} color="#4ECDC4" />
            <MetricCard title="LLM Queries" value={a.total_llm_queries || 0} icon={Zap} color="#45B7D1" />
            <MetricCard title="STT Calls" value={a.total_stt_calls || 0} icon={Mic} color="#96CEB4" />
            <MetricCard title="TTS Calls" value={a.total_tts_calls || 0} icon={Volume2} color="#FFEAA7" />
            <MetricCard title="Active Sessions" value={a.active_sessions || 0} icon={Activity} color="#DDA0DD" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard title="Avg Response" value={`${a.avg_response_time || 0}ms`} subtitle="LLM Latency" icon={Clock} color="#4ECDC4" />
            <MetricCard title="STT Latency" value={`${a.avg_stt_latency || 0}ms`} icon={Clock} color="#45B7D1" />
            <MetricCard title="TTS Latency" value={`${a.avg_tts_latency || 0}ms`} icon={Clock} color="#96CEB4" />
            <MetricCard title="Groundedness" value={(a.avg_groundedness || 0).toFixed(3)} subtitle="Accuracy" icon={TrendingUp} color="#FFEAA7" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard title="Total Cost" value={`Rp ${(a.total_cost_idr || 0).toLocaleString()}`} icon={DollarSign} color="#F75F5F" />
            <MetricCard title="LLM Cost" value={`Rp ${(a.cost_llm_idr || 0).toLocaleString()}`} icon={DollarSign} color="#4ECDC4" />
            <MetricCard title="STT Cost" value={`Rp ${(a.cost_stt_idr || 0).toLocaleString()}`} icon={DollarSign} color="#45B7D1" />
            <MetricCard title="TTS Cost" value={`Rp ${(a.cost_tts_idr || 0).toLocaleString()}`} icon={DollarSign} color="#96CEB4" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Total Queries Over Time" base64Image={a.charts?.queries_over_time} />
            <ChartCard title="Cost Comparison (IDR)" base64Image={a.charts?.cost_comparison} />
            <ChartCard title="Response Time Distribution" base64Image={a.charts?.response_time_dist} />
            <ChartCard title="STT vs TTS Latency" base64Image={a.charts?.stt_tts_latency} />
            <ChartCard title="Groundedness Over Time" base64Image={a.charts?.groundedness_over_time} />
            <ChartCard title="Service Call Volume" base64Image={a.charts?.service_volume} />
          </div>
        </div>
      )}
    </div>
  );
}

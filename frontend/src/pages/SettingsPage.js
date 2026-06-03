import React, { useState, useEffect } from 'react';
import { api, fileUrl } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Save, Globe2, BarChart3, Calendar, TrendingUp, Clock, Zap, DollarSign, Users, MessageSquare, Mic, Volume2, Activity } from 'lucide-react';
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

function ChartCard({ title, base64Image, color = '#F75F5F' }) {
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

export default function SettingsPage() {
  const { user, updateUser, language, setLanguage, t } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [avatarFileId, setAvatarFileId] = useState(user?.avatar_file_id || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
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
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (showAnalytics) fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAnalytics]);

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', 'avatar');
      const { data } = await api.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAvatarFileId(data.file_id);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', { full_name: fullName, language, avatar_file_id: avatarFileId || null });
      updateUser(data);
      toast.success('Profile updated');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const a = analyticsData || {};
  
  return (
    <div className="pb-24 lg:pb-0">
      <p className="text-xs uppercase tracking-[0.25em] font-mono" style={{ color: 'var(--primary)' }}>{t('settings.title')}</p>
      <h1 className="font-display text-3xl sm:text-4xl mt-2">{t('settings.yourProfile')}</h1>
      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{t('settings.customizeDesc')}</p>

      <div className="mt-8 card-surface p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20 border" style={{ borderColor: 'var(--border)' }}>
            <AvatarImage src={avatarFileId ? fileUrl(avatarFileId) : undefined} />
            <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{(fullName || user?.email || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <label className="inline-flex items-center gap-2 h-11 px-4 rounded-md cursor-pointer text-sm" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : avatarFileId ? 'Change' : 'Upload Photo'}
            <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
          </label>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Full Name</Label>
            <Input className="mt-2 h-11" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Email</Label>
            <Input disabled className="mt-2 h-11" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }} value={user?.email || ''} />
          </div>
        </div>

        <div className="mt-6">
          <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Language</Label>
          <div className="mt-2 inline-flex items-center gap-2 p-1 rounded-md" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
            <button onClick={() => setLanguage('en')} className="flex items-center gap-2 h-9 px-3 rounded text-xs font-mono" style={{ background: language === 'en' ? 'var(--primary)' : 'transparent', color: language === 'en' ? 'var(--bg)' : 'var(--text-secondary)' }}><Globe2 className="h-3.5 w-3.5" /> English</button>
            <button onClick={() => setLanguage('id')} className="flex items-center gap-2 h-9 px-3 rounded text-xs font-mono" style={{ background: language === 'id' ? 'var(--primary)' : 'transparent', color: language === 'id' ? 'var(--bg)' : 'var(--text-secondary)' }}><Globe2 className="h-3.5 w-3.5" /> Bahasa Indonesia</button>
          </div>
        </div>

      <div className="mt-8 flex gap-3">
          <Button onClick={save} disabled={saving} className="h-11 glow-primary" style={{ background: 'var(--primary)', color: 'var(--bg)' }}>
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="mt-6 card-surface p-6" style={{ borderColor: 'rgba(247,95,95,0.25)' }}>
        <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--danger)' }}>Danger Zone</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Once you delete your account, there is no going back.</p>
      </div>
    </div>
  );
}
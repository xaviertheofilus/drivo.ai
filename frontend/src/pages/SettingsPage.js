import React, { useState } from 'react';
import { api, fileUrl } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Save, Globe2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [avatarFileId, setAvatarFileId] = useState(user?.avatar_file_id || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="pb-24 md:pb-0">
      <p className="text-xs uppercase tracking-[0.25em] font-mono" style={{ color: 'var(--primary)' }}>Settings</p>
      <h1 className="font-display text-3xl sm:text-4xl mt-2">Your profile</h1>
      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Customize your DrivoAI experience.</p>

      <div className="mt-8 card-surface p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20 border" style={{ borderColor: 'var(--border)' }}>
            <AvatarImage src={avatarFileId ? fileUrl(avatarFileId) : undefined} />
            <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{(fullName || user?.email || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <label className="inline-flex items-center gap-2 h-11 px-4 rounded-md cursor-pointer text-sm" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} data-testid="settings-avatar-label">
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : avatarFileId ? 'Change photo' : 'Upload photo'}
            <input type="file" accept="image/*" className="hidden" onChange={onAvatar} data-testid="settings-avatar-input" />
          </label>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Full name</Label>
            <Input className="mt-2 h-11" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={fullName} onChange={(e) => setFullName(e.target.value)} data-testid="settings-name-input" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Email</Label>
            <Input disabled className="mt-2 h-11" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-muted)' }} value={user?.email || ''} />
          </div>
        </div>

        <div className="mt-6">
          <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Preferred language</Label>
          <div className="mt-2 inline-flex items-center gap-2 p-1 rounded-md" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }} data-testid="settings-language-toggle">
            <button onClick={() => setLanguage('en')} className="flex items-center gap-2 h-9 px-3 rounded text-xs font-mono" style={{ background: language === 'en' ? 'var(--primary)' : 'transparent', color: language === 'en' ? 'var(--bg)' : 'var(--text-secondary)' }}><Globe2 className="h-3.5 w-3.5" /> English</button>
            <button onClick={() => setLanguage('id')} className="flex items-center gap-2 h-9 px-3 rounded text-xs font-mono" style={{ background: language === 'id' ? 'var(--primary)' : 'transparent', color: language === 'id' ? 'var(--bg)' : 'var(--text-secondary)' }}><Globe2 className="h-3.5 w-3.5" /> Bahasa Indonesia</button>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>This is the default language for new sessions. You can switch any time during a drive.</p>
        </div>

        <div className="mt-8 flex gap-3">
          <Button onClick={save} disabled={saving} className="h-11 glow-primary" style={{ background: 'var(--primary)', color: 'var(--bg)' }} data-testid="settings-save-button">
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div className="mt-6 card-surface p-6" style={{ borderColor: 'rgba(247,95,95,0.25)' }}>
        <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--danger)' }}>Danger zone</p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Deleting your account removes all personas and session history. Currently locked—contact support to remove your data.</p>
      </div>
    </div>
  );
}

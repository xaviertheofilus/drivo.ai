import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fileUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Wand2, ArrowRight, ChevronLeft, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function PersonaBuilderTextPage() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarFileId, setAvatarFileId] = useState('');
  const [uploading, setUploading] = useState(false);

  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;
  const canGenerate = wordCount >= 8 && !loading;

  const generate = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/personas/generate', { description });
      // Persist to localStorage and route to preview
      const draft = { ...data, source_description: description, avatar_file_id: avatarFileId || null };
      localStorage.setItem('drivoai_persona_draft', JSON.stringify(draft));
      navigate('/personas/new/preview');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not generate persona');
    } finally {
      setLoading(false);
    }
  };

  const onAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', 'persona_avatar');
      const { data } = await api.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAvatarFileId(data.file_id);
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pb-24 md:pb-0">
      <Link to="/personas" className="inline-flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }} data-testid="builder-text-back-link">
        <ChevronLeft className="h-3.5 w-3.5" /> Personas
      </Link>
      <p className="text-xs uppercase tracking-[0.25em] font-mono mt-4" style={{ color: 'var(--primary)' }}>Step 1 · Describe</p>
      <h1 className="font-display text-3xl sm:text-4xl mt-2">Define Your Companion</h1>
      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>The more specific you are, the more uniquely they'll talk to you.</p>

      <div className="mt-8 grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 card-surface p-6">
          <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Description</Label>
          <Textarea
            data-testid="builder-text-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe who you want your driving companion to be. Their personality, how they talk, what they care about. The more specific, the better."
            className="mt-2 min-h-[260px] resize-none"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <div className="mt-2 flex items-center justify-between text-xs font-mono" style={{ color: wordCount > 500 ? 'var(--warning)' : 'var(--text-muted)' }}>
            <span>{wordCount} / 500 words</span>
            <Link to="/personas/new/file" className="underline" style={{ color: 'var(--primary)' }}>or upload a file instead</Link>
          </div>
        </div>
        <div className="lg:col-span-5 card-surface p-6">
          <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Persona Photo (optional)</Label>
          <div className="mt-3 flex items-center gap-4">
            <Avatar className="h-20 w-20 border" style={{ borderColor: 'var(--border)' }}>
              <AvatarImage src={avatarFileId ? fileUrl(avatarFileId) : undefined} />
              <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>?</AvatarFallback>
            </Avatar>
            <label className="inline-flex items-center gap-2 h-11 px-4 rounded-md cursor-pointer text-sm" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : avatarFileId ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} data-testid="builder-text-avatar-input" />
            </label>
          </div>
          <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>This becomes your AI agent's profile photo. PNG/JPG up to 10MB.</p>
        </div>
      </div>

      {error && <p className="text-xs mt-3" style={{ color: 'var(--danger)' }} data-testid="builder-text-error">{error}</p>}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button
          data-testid="builder-text-generate-button"
          onClick={generate}
          disabled={!canGenerate}
          className="h-12 px-6 text-base glow-primary"
          style={{ background: 'var(--primary)', color: 'var(--bg)' }}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {loading ? 'Generating…' : 'Generate Persona'}
        </Button>
        <Button asChild variant="ghost" className="h-12 px-6"><Link to="/personas">Cancel</Link></Button>
      </div>
    </div>
  );
}

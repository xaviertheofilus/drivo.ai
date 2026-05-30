import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fileUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, RefreshCw, Save, Upload } from 'lucide-react';
import { toast } from 'sonner';

const REGEN_LIMIT = 3;

export default function PersonaPreviewPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [regenCount, setRegenCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('drivoai_persona_draft');
    if (!raw) {
      navigate('/personas/new/text');
      return;
    }
    setDraft(JSON.parse(raw));
  }, [navigate]);

  if (!draft) return null;

  const updateField = (k, v) => setDraft({ ...draft, [k]: v });

  const regenerate = async () => {
    if (regenCount >= REGEN_LIMIT) return;
    setBusy(true);
    try {
      const desc = draft.source_description || draft.extracted_text_preview || draft.personality_summary || '';
      const { data } = await api.post('/personas/generate', { description: desc });
      const merged = { ...data, source_description: draft.source_description, source_file_id: draft.source_file_id, avatar_file_id: draft.avatar_file_id, extracted_text_preview: draft.extracted_text_preview };
      setDraft(merged);
      localStorage.setItem('drivoai_persona_draft', JSON.stringify(merged));
      setRegenCount((c) => c + 1);
    } catch (e) {
      toast.error('Regenerate failed');
    } finally {
      setBusy(false);
    }
  };

  const save = async (activate = true) => {
    setBusy(true);
    try {
      const payload = {
        name: draft.name,
        personality_summary: draft.personality_summary,
        communication_style: draft.communication_style,
        tone_tags: draft.tone_tags || [],
        system_prompt: draft.system_prompt_fragment || draft.system_prompt,
        sample_dialogue: draft.sample_dialogue,
        avatar_file_id: draft.avatar_file_id || null,
        source_file_id: draft.source_file_id || null,
      };
      const { data } = await api.post('/personas', payload);
      if (activate) await api.put(`/personas/${data.id}/activate`);
      localStorage.removeItem('drivoai_persona_draft');
      toast.success(activate ? `${data.name} is now your active persona` : 'Persona saved');
      navigate('/personas');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setBusy(false);
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
      const next = { ...draft, avatar_file_id: data.file_id };
      setDraft(next);
      localStorage.setItem('drivoai_persona_draft', JSON.stringify(next));
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pb-24 md:pb-0">
      <Link to="/personas/new/text" className="inline-flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
        <ChevronLeft className="h-3.5 w-3.5" /> Back
      </Link>
      <p className="text-xs uppercase tracking-[0.25em] font-mono mt-4" style={{ color: 'var(--primary)' }}>Step 2 · Preview</p>
      <h1 className="font-display text-3xl sm:text-4xl mt-2">Meet your companion</h1>
      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Make adjustments below. You can regenerate up to {REGEN_LIMIT} times.</p>

      <div className="mt-8 grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 card-surface p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border" style={{ borderColor: 'var(--border)' }}>
              <AvatarImage src={draft.avatar_file_id ? fileUrl(draft.avatar_file_id) : undefined} />
              <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{(draft.name || 'AI').slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Name</Label>
              <Input value={draft.name || ''} onChange={(e) => updateField('name', e.target.value)} className="mt-1 h-11 font-display text-xl" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} data-testid="preview-name-input" />
            </div>
            <label className="inline-flex items-center gap-2 h-11 px-4 rounded-md cursor-pointer text-sm" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Photo'}
              <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} data-testid="preview-avatar-input" />
            </label>
          </div>

          <div className="mt-5">
            <Label className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Personality</Label>
            <Textarea value={draft.personality_summary || ''} onChange={(e) => updateField('personality_summary', e.target.value)} className="mt-1 min-h-[120px]" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} data-testid="preview-personality-input" />
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Style</Label>
              <Input value={draft.communication_style || ''} onChange={(e) => updateField('communication_style', e.target.value)} className="mt-1 h-11" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} data-testid="preview-style-input" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Tone Tags</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(draft.tone_tags || []).map((t, i) => (
                  <Badge key={i} variant="outline" className="font-mono text-[10px] uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{t}</Badge>
                ))}
              </div>
            </div>
          </div>

          {draft.sample_dialogue && (
            <div className="mt-5 rounded-md p-4" style={{ background: 'var(--surface-alt)', borderLeft: '2px solid var(--primary)' }}>
              <p className="text-xs uppercase font-mono tracking-widest" style={{ color: 'var(--text-muted)' }}>Sample dialogue</p>
              <p className="italic mt-2" style={{ color: 'var(--text-primary)' }}>“{draft.sample_dialogue.ai}”</p>
              <p className="italic mt-1" style={{ color: 'var(--text-secondary)' }}>You: “{draft.sample_dialogue.user}”</p>
              <p className="italic mt-1" style={{ color: 'var(--text-primary)' }}>“{draft.sample_dialogue.ai_followup}”</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 card-surface p-6">
          <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>System prompt</p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>This is exactly how DrivoAI will instruct the model in your sessions.</p>
          <Textarea value={draft.system_prompt_fragment || draft.system_prompt || ''} onChange={(e) => updateField('system_prompt_fragment', e.target.value)} className="mt-3 min-h-[260px] font-mono text-[12px]" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} data-testid="preview-prompt-input" />
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button onClick={() => save(true)} disabled={busy} className="h-12 px-6 glow-primary" style={{ background: 'var(--primary)', color: 'var(--bg)' }} data-testid="preview-save-activate-button">
          <Save className="h-4 w-4 mr-2" /> Save & Activate
        </Button>
        <Button onClick={() => save(false)} disabled={busy} variant="outline" className="h-12 px-6" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }} data-testid="preview-save-only-button">Save without activating</Button>
        <Button onClick={regenerate} disabled={busy || regenCount >= REGEN_LIMIT} variant="ghost" className="h-12 px-6" data-testid="preview-regenerate-button">
          <RefreshCw className="h-4 w-4 mr-2" /> Regenerate <span className="font-mono ml-2 text-xs">{regenCount}/{REGEN_LIMIT}</span>
        </Button>
      </div>
    </div>
  );
}

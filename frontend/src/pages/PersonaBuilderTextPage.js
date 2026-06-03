import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, fileUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Wand2, ChevronLeft, Upload, FileText, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/AuthContext';

const ACCEPT = ['.txt', '.pdf', '.docx'];

export default function PersonaBuilderTextPage() {
  const navigate = useNavigate();
  const { t } = useAuth();
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarFileId, setAvatarFileId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sourceFile, setSourceFile] = useState(null);
  const [uploadingSource, setUploadingSource] = useState(false);
  const [voiceId, setVoiceId] = useState('marin');
  const [voices, setVoices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const draftRaw = localStorage.getItem('drivoai_persona_draft');
    if (draftRaw) {
      const draft = JSON.parse(draftRaw);
      setDescription(draft.personality_summary || '');
      setName(draft.name || '');
      setAvatarFileId(draft.avatar_file_id || '');
      setVoiceId(draft.voice_id || 'marin');
      setEditingId(draft.editing_id || null);
      if (draft.source_file_id) {
        setSourceFile({ file_id: draft.source_file_id, name: 'Attached File' });
      }
    }

    const fetchVoices = async () => {
      try {
        const { data } = await api.get('/voices');
        setVoices(data || []);
      } catch (err) {
        console.error('Failed to fetch voices:', err);
      }
    };
    fetchVoices();
  }, []);

  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;
  const MIN_WORDS = editingId ? 0 : 15;
  const canGenerate = (wordCount >= MIN_WORDS || editingId) && !loading;

  const save = async () => {
    setError('');
    if (!editingId && wordCount < MIN_WORDS) {
      setError(t('personaBuilder.minWordsError', MIN_WORDS));
      return;
    }
    setLoading(true);
    try {
      let payload;
      if (editingId) {
        payload = {
          name: name || 'Companion',
          personality_summary: description,
          voice_id: voiceId,
          avatar_file_id: avatarFileId || null,
        };
        await api.put(`/personas/${editingId}`, payload);
      } else {
        // Generate profile first
        let profile;
        let sourceText = null;
        if (sourceFile?.file_id) {
          const { data } = await api.post('/personas/from-uploaded', { file_id: sourceFile.file_id, description });
          profile = data?.profile || {};
          sourceText = data?.source_text || null;
        } else {
          const { data } = await api.post('/personas/generate', { description });
          profile = data || {};
        }
        payload = {
          name: profile.name || name || 'Companion',
          personality_summary: profile.personality_summary || description,
          communication_style: profile.communication_style || 'casual',
          tone_tags: profile.tone_tags || [],
          system_prompt: profile.system_prompt || 'You are a helpful driving companion.',
          sample_dialogue: null,
          source_text: sourceText,
          avatar_file_id: avatarFileId || null,
          source_file_id: sourceFile?.file_id || null,
          voice_id: voiceId || 'marin',
        };
        await api.post('/personas', payload);
      }
      localStorage.removeItem('drivoai_persona_draft');
      toast.success(t('personas.saved'));
      navigate('/personas');
    } catch (e) {
      const detail = e?.response?.data?.detail;
      setError(detail || t('personaBuilder.couldNotGenerate'));
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
      toast.success(t('settings.photoUploaded'));
    } catch (err) {
      toast.error(t('common.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (f) => {
    const ok = ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      setError(t('personaBuilder.onlyFormats'));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(t('personaBuilder.maxSize'));
      return;
    }
    setError('');
    setUploadingSource(true);
    try {
      const form = new FormData();
      form.append('file', f);
      form.append('purpose', 'persona_context');
      const { data } = await api.post('/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSourceFile({ file_id: data.file_id, name: data.filename || f.name, size: data.size || f.size, content_type: data.content_type || f.type });
      toast.success(t('personaBuilder.fileUploaded'));
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (detail === 'FILE_TOO_LARGE') setError(t('personaBuilder.maxSize'));
      else if (detail === 'UNSUPPORTED_FILE_TYPE') setError(t('personaBuilder.onlyFormats'));
      else setError(detail || t('common.uploadFailed'));
    } finally {
      setUploadingSource(false);
    }
  };

  return (
    <div className="pb-24 lg:pb-0">
      <Link to="/personas" className="inline-flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }} data-testid="builder-text-back-link">
        <ChevronLeft className="h-3.5 w-3.5" /> {t('nav.personas')}
      </Link>
      <p className="text-xs uppercase tracking-[0.25em] font-mono mt-4" style={{ color: 'var(--primary)' }}>{editingId ? 'Edit Persona' : t('personaBuilder.step1Describe')}</p>
      <h1 className="font-display text-3xl sm:text-4xl mt-2">{editingId ? 'Update your companion' : t('personaBuilder.defineTitle')}</h1>
      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{t('personaBuilder.defineHint')}</p>

      <div className="mt-8 grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 card-surface p-6">
          <div className="mb-5">
            <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('personaPreview.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Companion Name"
              className="mt-2 h-11"
              style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('personaBuilder.description')}</Label>
          <Textarea
            data-testid="builder-text-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('personaBuilder.descriptionPlaceholder')}
            className="mt-2 min-h-[260px] resize-none"
            style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <div className="mt-2 flex items-center justify-between text-xs font-mono" style={{ color: wordCount > 500 ? 'var(--warning)' : 'var(--text-muted)' }}>
            <span>{wordCount} / 500</span>
            {!editingId && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="underline"
                style={{ color: 'var(--primary)' }}
                data-testid="builder-text-attach-file-link"
              >
                {t('personaBuilder.uploadInstead')}
              </button>
            )}
          </div>

          {!editingId && (
            <>
              <div className="mt-4 rounded-[var(--radius-lg)] p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('personaBuilder.guideTitle')}</p>
                <div className="mt-2 text-[12px] leading-5" style={{ color: 'var(--text-muted)' }}>
                  <div>• {t('personaBuilder.guide1')}</div>
                  <div>• {t('personaBuilder.guide2')}</div>
                  <div>• {t('personaBuilder.guide3')}</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('personaBuilder.attachFileOptional')}</Label>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{t('personaBuilder.attachFileHint')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10"
                    style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="builder-text-choose-file-button"
                    disabled={uploadingSource}
                  >
                    <FileText className="h-4 w-4 mr-2" /> {uploadingSource ? t('personaBuilder.uploadingFile') : t('personaBuilder.chooseFile')}
                  </Button>
                  <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.pdf,.docx" onChange={onPickFile} data-testid="builder-text-file-input" />
                </div>

                {sourceFile && (
                  <div className="mt-3 rounded-[var(--radius-lg)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="p-4 flex items-center gap-4">
                      <div className="h-11 w-11 rounded-md grid place-items-center" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                        <FileText className="h-5 w-5" style={{ color: 'var(--primary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{sourceFile.name}</p>
                        <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{(Number(sourceFile.size || 0) / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSourceFile(null)}
                        className="p-2 rounded-md hover:bg-white/10"
                        data-testid="builder-text-remove-file"
                        aria-label={t('personaBuilder.removeFile')}
                      >
                        <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 text-[11px] font-mono" style={{ color: wordCount >= MIN_WORDS ? 'var(--accent)' : 'var(--warning)' }} data-testid="builder-text-min-words">
                  {t('personaBuilder.minWordsHint', MIN_WORDS)}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="lg:col-span-5 card-surface p-6">
          <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('personaBuilder.photoOptional')}</Label>
          <div className="mt-3 flex items-center gap-4">
            <Avatar className="h-20 w-20 border" style={{ borderColor: 'var(--border)' }}>
              <AvatarImage src={avatarFileId ? fileUrl(avatarFileId) : undefined} />
              <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>?</AvatarFallback>
            </Avatar>
            <label className="inline-flex items-center gap-2 h-11 px-4 rounded-md cursor-pointer text-sm" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <Upload className="h-4 w-4" /> {uploading ? t('common.saving') : avatarFileId ? t('common.changePhoto') : t('common.uploadPhoto')}
              <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} data-testid="builder-text-avatar-input" />
            </label>
          </div>
          <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>{t('personaBuilder.photoHint')}</p>

          <div className="mt-6">
            <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('personaPreview.voiceTone')}</Label>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="mt-2 h-11 w-full rounded-md px-3 font-mono text-xs"
              style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"].map((v) => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="text-xs mt-3" style={{ color: 'var(--danger)' }} data-testid="builder-text-error">{error}</p>}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button
          data-testid="builder-text-generate-button"
          onClick={save}
          disabled={!canGenerate}
          className="h-12 px-6 text-base glow-primary"
          style={{ background: 'var(--primary)', color: 'var(--bg)' }}
        >
          <Wand2 className="h-4 w-4 mr-2" />
          {loading ? (editingId ? 'Saving...' : t('personaBuilder.generating')) : (editingId ? 'Save Persona' : t('personaBuilder.generatePersona'))}
        </Button>
        <Button asChild variant="ghost" className="h-12 px-6"><Link to="/personas">{t('common.cancel')}</Link></Button>
      </div>
    </div>
  );
}

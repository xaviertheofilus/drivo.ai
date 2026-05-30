import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Upload, FileText, X, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPT = ['.txt', '.pdf', '.docx'];

export default function PersonaBuilderFilePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };
  const handleFile = (f) => {
    const ok = ACCEPT.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      setError('Only .txt, .pdf, .docx supported');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Max 10MB');
      return;
    }
    setError('');
    setFile(f);
  };

  const onGenerate = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/personas/from-file', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const draft = { ...data, avatar_file_id: null };
      localStorage.setItem('drivoai_persona_draft', JSON.stringify(draft));
      navigate('/personas/new/preview');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not generate persona');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 md:pb-0">
      <Link to="/personas" className="inline-flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }} data-testid="builder-file-back-link">
        <ChevronLeft className="h-3.5 w-3.5" /> Personas
      </Link>
      <p className="text-xs uppercase tracking-[0.25em] font-mono mt-4" style={{ color: 'var(--primary)' }}>Step 1 · Upload</p>
      <h1 className="font-display text-3xl sm:text-4xl mt-2">Drop a reference file</h1>
      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>We'll read it and design a companion around the voice in your document.</p>

      <div className="mt-8">
        <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Source Document</Label>
        <div
          data-testid="builder-file-dropzone"
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className="mt-2 rounded-[var(--radius-lg)] border border-dashed transition-colors"
          style={{
            background: drag ? 'rgba(79,142,247,0.06)' : 'var(--surface)',
            borderColor: drag ? 'var(--primary)' : 'var(--border)',
          }}
        >
          {!file && (
            <label className="flex flex-col items-center justify-center gap-3 py-16 cursor-pointer">
              <Upload className="h-7 w-7" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Drop your file here or click to browse</p>
              <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>.txt · .pdf · .docx · max 10MB</p>
              <input type="file" className="hidden" accept=".txt,.pdf,.docx" onChange={onPick} data-testid="builder-file-input" />
            </label>
          )}
          {file && (
            <div className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-md grid place-items-center" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                <FileText className="h-5 w-5" style={{ color: 'var(--primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => setFile(null)} className="p-2 rounded-md hover:bg-white/10" data-testid="builder-file-remove">
                <X className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs mt-3" style={{ color: 'var(--danger)' }} data-testid="builder-file-error">{error}</p>}

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onGenerate}
          disabled={!file || loading}
          className="h-12 px-6 text-base glow-primary"
          style={{ background: 'var(--primary)', color: 'var(--bg)' }}
          data-testid="builder-file-generate-button"
        >
          <Wand2 className="h-4 w-4 mr-2" />{loading ? 'Reading & generating…' : 'Generate Persona'}
        </Button>
        <Button asChild variant="ghost" className="h-12 px-6"><Link to="/personas/new/text">Switch to text input</Link></Button>
      </div>
    </div>
  );
}

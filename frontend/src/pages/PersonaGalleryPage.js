import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Type } from 'lucide-react';
import { PersonaCard } from '@/components/PersonaCard';
import { toast } from 'sonner';

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function PersonaGalleryPage() {
  const { data: templates, mutate: mutateTemplates } = useSWR('/personas/templates', fetcher);
  const { data: customs, mutate: mutateCustoms } = useSWR('/personas', fetcher);
  const { data: active, mutate: mutateActive } = useSWR('/personas/active', fetcher);
  const navigate = useNavigate();
  const [working, setWorking] = useState(false);

  const onActivate = async (p) => {
    setWorking(true);
    try {
      await api.put(`/personas/${p.id}/activate`);
      toast.success(`${p.name} is now active`);
      await Promise.all([mutateActive(), mutateCustoms(), mutateTemplates()]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Activate failed');
    } finally {
      setWorking(false);
    }
  };

  const onDelete = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    await api.delete(`/personas/${p.id}`);
    toast.success('Persona deleted');
    mutateCustoms();
  };

  const onEdit = (p) => {
    // Save to localstorage and route to text builder in edit mode
    localStorage.setItem('drivoai_edit_persona', JSON.stringify(p));
    navigate('/personas/new/text');
  };

  return (
    <div className="pb-24 md:pb-0">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] font-mono" style={{ color: 'var(--primary)' }}>Personas</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">Your Companions</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Pick a template or design your own.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-11" style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }} data-testid="personas-new-file-button">
            <Link to="/personas/new/file"><FileText className="h-4 w-4 mr-2" /> From File</Link>
          </Button>
          <Button asChild className="h-11 glow-primary" style={{ background: 'var(--primary)', color: 'var(--bg)' }} data-testid="personas-new-text-button">
            <Link to="/personas/new/text"><Plus className="h-4 w-4 mr-2" /> Create Custom</Link>
          </Button>
        </div>
      </div>

      <section className="mt-10">
        <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Prebuilt Templates</p>
        <h2 className="font-display text-2xl mt-1">Curated by DrivoAI</h2>
        <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {(templates || []).map((p) => (
            <PersonaCard
              key={p.id}
              persona={p}
              isActive={active?.id === p.id}
              onSelect={onActivate}
              variant="template"
            />
          ))}
          {!templates && (<div className="col-span-full text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</div>)}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-3">
          <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Your Custom</p>
          {customs && customs.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--surface-alt)', color: 'var(--text-muted)' }}>{customs.length} / 5</span>
          )}
        </div>
        <h2 className="font-display text-2xl mt-1">Your designed personas</h2>

        <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {(customs || []).map((p) => (
            <PersonaCard
              key={p.id}
              persona={p}
              isActive={active?.id === p.id}
              onSelect={onActivate}
              onEdit={onEdit}
              onDelete={onDelete}
              variant="custom"
            />
          ))}
          {customs && customs.length === 0 && (
            <div className="col-span-full card-surface p-10 text-center">
              <Type className="mx-auto h-7 w-7 mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No custom personas yet. Build one in 30 seconds.</p>
              <Button asChild className="mt-4 h-11" style={{ background: 'var(--primary)', color: 'var(--bg)' }} data-testid="personas-empty-create-button">
                <Link to="/personas/new/text">Create your first</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

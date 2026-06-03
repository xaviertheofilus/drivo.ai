import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Edit3, Trash2 } from 'lucide-react';
import { fileUrl, avatarSeedUrl } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export const PersonaCard = ({
  persona,
  isActive = false,
  onSelect,
  onEdit,
  onDelete,
  showActions = true,
  variant = 'template',
}) => {
  const { t } = useAuth();
  if (!persona) return null;
  const tags = persona.tone_tags || [];
  const avatarSrc = persona.avatar_file_id
    ? fileUrl(persona.avatar_file_id)
    : avatarSeedUrl(persona.avatar_seed || persona.slug || persona.id || persona.name);
  const sample = persona.sample_dialogue || {};

  return (
    <div
      data-testid={`persona-card-${persona.id || persona.slug}`}
      className={`relative card-surface p-5 transition-colors duration-200 ${
        isActive ? 'border-[color:var(--primary)]/40' : 'hover:border-white/15'
      }`}
    >
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-mono" style={{ background: 'rgba(127,224,176,0.12)', color: 'var(--accent)', border: '1px solid rgba(127,224,176,0.25)' }}>
          <Check className="h-3 w-3" /> {t('common.active')}
        </div>
      )}
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 border" style={{ borderColor: 'var(--border)' }}>
          <AvatarImage src={avatarSrc} alt={persona.name} />
          <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>
            {(persona.name || 'AI').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-2xl text-[color:var(--text-primary)] leading-tight">{persona.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] uppercase tracking-wider font-mono" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
        {(persona.personality_summary || '').slice(0, 180)}
        {(persona.personality_summary || '').length > 180 ? '…' : ''}
      </p>

      {showActions && (
        <div className="mt-5 flex items-center gap-2">
          <Button
            data-testid={`persona-card-select-${persona.id || persona.slug}`}
            onClick={() => onSelect && onSelect(persona)}
            className="flex-1 h-11"
            style={{ background: isActive ? 'var(--surface-alt)' : 'var(--primary)', color: isActive ? 'var(--text-primary)' : 'var(--bg)' }}
          >
            {isActive ? t('common.alreadyActive') : t('common.activate')}
          </Button>
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onEdit(persona)} data-testid={`persona-card-edit-${persona.id}`}>
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
          {variant !== 'template' && onDelete && (
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onDelete(persona)} data-testid={`persona-card-delete-${persona.id}`}>
              <Trash2 className="h-4 w-4" style={{ color: 'var(--danger)' }} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

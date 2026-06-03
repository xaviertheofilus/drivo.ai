import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export const DrowsinessAlert = ({ visible, severity = 'warning', onDismiss, language = 'en' }) => {
  const isDanger = severity === 'danger';
  const { tWithLang } = useAuth();
  const lang = language === 'id' ? 'id' : 'en';
  const text = isDanger ? tWithLang(lang, 'drowsiness.messageDanger') : tWithLang(lang, 'drowsiness.messageWarning');
  const title = isDanger ? tWithLang(lang, 'drowsiness.titleDanger') : tWithLang(lang, 'drowsiness.titleWarning');
  const dismissLabel = tWithLang(lang, 'drowsiness.dismiss');
  const color = isDanger ? 'var(--danger)' : 'var(--warning)';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-3 left-3 right-3 z-50 rounded-[var(--radius-lg)] p-4 backdrop-blur"
          style={{
            background: 'rgba(18,18,26,0.85)',
            border: `1px solid ${color}`,
            boxShadow: `0 0 0 1px ${color}, 0 18px 60px rgba(0,0,0,0.5)`,
          }}
          data-testid="drowsiness-alert-banner"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5" style={{ color }}>
              {isDanger ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-widest font-mono" style={{ color }}>
                {title}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{text}</p>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              data-testid="drowsiness-alert-dismiss"
              aria-label={dismissLabel}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

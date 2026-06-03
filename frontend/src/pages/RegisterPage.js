import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { register, t } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name);
      toast.success(t('auth.welcome'));
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || t('auth.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12" style={{ background: 'var(--bg)' }}>
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 hero-bg" style={{ borderRight: '1px solid var(--border)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md grid place-items-center" style={{ background: 'var(--primary)' }}>
            <Mic className="h-4 w-4" style={{ color: 'var(--bg)' }} />
          </div>
          <span className="font-display text-xl">DrivoAI</span>
        </Link>
        <div>
          <p className="font-display text-3xl leading-tight max-w-md">{t('auth.sideRegisterTitle')}</p>
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('auth.sideRegisterTagline')}</p>
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>© 2026 DrivoAI</div>
      </div>

      <div className="lg:col-span-7 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl sm:text-4xl">{t('auth.register')}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('auth.registerDesc')}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('auth.fullName')}</Label>
              <Input
                data-testid="register-name-input"
                className="mt-2 h-12"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder={t('auth.namePlaceholder')}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('auth.email')}</Label>
              <Input
                data-testid="register-email-input"
                type="email"
                required
                className="mt-2 h-12"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('auth.password')}</Label>
              <Input
                data-testid="register-password-input"
                type="password"
                required
                className="mt-2 h-12"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t('auth.passwordDescPlaceholder')}
              />
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{t('auth.passwordHint')}</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('auth.confirmPassword')}</Label>
              <Input
                data-testid="register-confirm-input"
                type="password"
                required
                className="mt-2 h-12"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder={t('auth.confirmPasswordPlaceholder')}
              />
            </div>

            {error && <p className="text-xs" style={{ color: 'var(--danger)' }} data-testid="register-error">{error}</p>}

            <Button
              type="submit"
              data-testid="register-submit-button"
              disabled={loading}
              className="w-full h-12 glow-primary"
              style={{ background: 'var(--primary)', color: 'var(--bg)' }}
            >
              {loading ? t('common.saving') : t('auth.register')}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
            {t('auth.alreadyHave')}{' '}
            <Link to="/login" className="underline" style={{ color: 'var(--primary)' }} data-testid="register-to-login-link">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

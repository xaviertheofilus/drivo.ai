import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, t } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const quoteLines = String(t('auth.sideLoginQuote')).split('\n');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t('auth.welcomeBack'));
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.detail || t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12" style={{ background: 'var(--bg)' }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-10 hero-bg relative" style={{ borderRight: '1px solid var(--border)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md grid place-items-center" style={{ background: 'var(--primary)' }}>
            <Mic className="h-4 w-4" style={{ color: 'var(--bg)' }} />
          </div>
          <span className="font-display text-xl">DrivoAI</span>
        </Link>
        <div>
          <p className="font-display text-3xl leading-tight max-w-md">
            “{quoteLines[0]}<br />{quoteLines.slice(1).join(' ')}”
          </p>
          <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('auth.sideLoginTagline')}
          </p>
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>© 2026 DrivoAI</div>
      </div>

      {/* Right form */}
      <div className="lg:col-span-7 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl sm:text-4xl">{t('auth.login')}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('auth.loginDesc')}</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('auth.email')}</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-12"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>{t('auth.password')}</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-12"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label={t('auth.togglePassword')}
                  data-testid="login-password-toggle"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs" style={{ color: 'var(--danger)' }} data-testid="login-error">{error}</p>}

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full h-12 glow-primary"
              style={{ background: 'var(--primary)', color: 'var(--bg)' }}
            >
              {loading ? t('common.saving') : t('auth.login')}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
            {t('auth.newTo')}{' '}
            <Link to="/register" className="underline" style={{ color: 'var(--primary)' }} data-testid="login-to-register-link">
              {t('auth.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

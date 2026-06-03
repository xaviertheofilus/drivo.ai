import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, Sparkles, ShieldAlert, Globe2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function LandingPage() {
  const { token, t } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      {/* Top bar */}
      <header className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md grid place-items-center" style={{ background: 'var(--primary)' }}>
            <Mic className="h-4 w-4" style={{ color: 'var(--bg)' }} />
          </div>
          <span className="font-display text-xl">DrivoAI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="h-9 px-4" data-testid="landing-login-link">
            <Link to="/login">{t('landing.login')}</Link>
          </Button>
          <Button
            data-testid="landing-get-started-button"
            onClick={() => navigate(token ? '/dashboard' : '/register')}
            className="h-10 px-4 font-medium"
            style={{ background: 'var(--primary)', color: 'var(--bg)' }}
          >
            {t('landing.getStarted')}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative hero-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <p data-testid="landing-eyebrow" className="text-xs uppercase tracking-[0.25em] font-mono" style={{ color: 'var(--primary)' }}>
              {t('landing.eyebrow')}
            </p>
            <h1 className="mt-4 font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.05]">
              {t('landing.heroLine1')}<br />
              <span style={{ color: 'var(--text-secondary)' }}>{t('landing.heroLine2')}</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              {t('landing.heroDesc')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                data-testid="landing-cta-start"
                onClick={() => navigate(token ? '/dashboard' : '/register')}
                className="h-14 px-6 text-base glow-primary"
                style={{ background: 'var(--primary)', color: 'var(--bg)' }}
              >
                {t('landing.ctaStart')} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button asChild variant="ghost" className="h-14 px-4 text-base">
                <a href="#how">{t('landing.ctaSeeHow')}</a>
              </Button>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[var(--radius-lg)] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <img
                src="https://images.unsplash.com/photo-1553437116-0b7aa9ff38dc?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80"
                alt={t('landing.heroImageAlt')}
                className="w-full h-[420px] object-cover opacity-90"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.05) 0%, rgba(10,10,15,0.85) 100%)' }} />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--accent)' }}>{t('landing.companionTitle')}</p>
                <p className="font-display text-2xl mt-1">“{t('landing.companionQuote')}”</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Sparkles, titleKey: 'landing.feature1Title', descKey: 'landing.feature1Desc' },
            { icon: Mic, titleKey: 'landing.feature2Title', descKey: 'landing.feature2Desc' },
            { icon: ShieldAlert, titleKey: 'landing.feature3Title', descKey: 'landing.feature3Desc' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.titleKey} className="card-surface p-6">
                <div className="h-10 w-10 rounded-md grid place-items-center" style={{ background: 'rgba(79,142,247,0.12)', color: 'var(--primary)' }}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl">{t(f.titleKey)}</h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{t(f.descKey)}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-12 card-surface p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--accent)' }}>{t('landing.bilingualTitle')}</p>
            <h3 className="mt-2 font-display text-2xl">{t('landing.bilingualSubtitle')}</h3>
            <p className="mt-1 text-sm max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              {t('landing.bilingualDesc')}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
            <Globe2 className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-mono">EN · ID</span>
          </div>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <p>{t('landing.footerCopy')}</p>
          <div className="flex items-center gap-4">
            <a href="#privacy" className="hover:text-[color:var(--text-secondary)]">{t('landing.footerPrivacy')}</a>
            <a href="#terms" className="hover:text-[color:var(--text-secondary)]">{t('landing.footerTerms')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

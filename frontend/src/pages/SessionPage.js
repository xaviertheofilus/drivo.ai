import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fileUrl, avatarSeedUrl } from '@/lib/api';
import { VoiceOrb } from '@/components/VoiceOrb';
import { DrowsinessAlert } from '@/components/DrowsinessAlert';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, PhoneOff, Globe2, MessageSquare, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createRecognizer, speak, stopSpeaking, getSpeechRecognition } from '@/lib/voice';

function fmtClock(seconds) {
  if (!seconds || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function SessionPage() {
  const navigate = useNavigate();
  const sessionRaw = localStorage.getItem('drivoai_active_session');
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;

  const [language, setLanguage] = useState(session?.language || 'en');
  const [orbState, setOrbState] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [lastAI, setLastAI] = useState(session?.greeting || '');
  const [lastUser, setLastUser] = useState('');
  const [alertSeverity, setAlertSeverity] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const [hasRecognition, setHasRecognition] = useState(true);

  const recognizerRef = useRef(null);
  const lastUserSpeakAt = useRef(Date.now());
  const lastAISpeakAt = useRef(Date.now());
  const proactiveTimer = useRef(null);
  const sessionStartRef = useRef(Date.now());
  const lastVolumeRef = useRef(0.5);

  // Redirect if no session
  useEffect(() => {
    if (!session) {
      navigate('/dashboard');
      return;
    }
    setHasRecognition(Boolean(getSpeechRecognition()));
    // Speak greeting
    if (session.greeting) {
      setOrbState('speaking');
      speak(session.greeting, session.language || 'en', { onEnd: () => setOrbState('idle') });
    }
    return () => {
      stopSpeaking();
      stopRecognizer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    const id = setInterval(() => setTimer(Math.floor((Date.now() - sessionStartRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // Proactive check loop
  useEffect(() => {
    const id = setInterval(async () => {
      const idleSec = (Date.now() - lastUserSpeakAt.current) / 1000;
      const sinceAI = (Date.now() - lastAISpeakAt.current) / 1000;
      if (idleSec > 90 && sinceAI > 30 && !muted && session?.session_id) {
        try {
          lastAISpeakAt.current = Date.now();
          const { data } = await api.post(`/sessions/${session.session_id}/proactive`);
          handleAIReply(data.ai_reply);
        } catch {}
      }
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  // Recognizer lifecycle
  useEffect(() => {
    if (muted) {
      stopRecognizer();
      setOrbState('idle');
      return;
    }
    startRecognizer();
    return () => stopRecognizer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, language]);

  const startRecognizer = () => {
    if (!hasRecognition) return;
    if (recognizerRef.current) return;
    const rec = createRecognizer({
      language,
      onResult: ({ interim, final }) => {
        setInterim(interim);
        if (interim) lastVolumeRef.current = 0.6;
        if (final && final.trim()) {
          submitTurn(final.trim());
        }
      },
      onEnd: () => {
        recognizerRef.current = null;
        if (!muted) {
          // restart
          setTimeout(() => startRecognizer(), 300);
        }
      },
      onError: (e) => {
        if (e?.error === 'not-allowed') {
          toast.error('Microphone permission denied. Use text input.');
          setMuted(true);
          setShowFallback(true);
        }
      },
    });
    if (!rec) {
      setHasRecognition(false);
      return;
    }
    recognizerRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setOrbState('listening');
    } catch {}
  };

  const stopRecognizer = () => {
    try { recognizerRef.current?.stop(); } catch {}
    recognizerRef.current = null;
    setListening(false);
  };

  const submitTurn = async (text) => {
    if (!session?.session_id) return;
    const latencyMs = Date.now() - lastAISpeakAt.current;
    const silenceSec = (Date.now() - lastUserSpeakAt.current) / 1000;
    lastUserSpeakAt.current = Date.now();
    setLastUser(text);
    setInterim('');
    setOrbState('speaking');
    try {
      const { data } = await api.post(`/sessions/${session.session_id}/turn`, {
        text,
        language,
        latency_ms: Math.max(0, latencyMs),
        silence_seconds: Math.max(0, silenceSec),
        speech_energy: lastVolumeRef.current || 0.5,
      });
      lastAISpeakAt.current = Date.now();
      handleAIReply(data.ai_reply);
      if (data.severity === 'warning' || data.severity === 'danger') {
        setAlertSeverity(data.severity === 'danger' ? 'danger' : 'warning');
        setShowAlert(true);
        setOrbState(data.severity === 'danger' ? 'danger' : 'warning');
        setTimeout(() => setShowAlert(false), 30000);
      }
    } catch (e) {
      toast.error('Connection issue, try again');
      setOrbState('idle');
    }
  };

  const handleAIReply = (text) => {
    setLastAI(text);
    stopSpeaking();
    // pause STT while AI speaks
    stopRecognizer();
    setOrbState('speaking');
    speak(text, language, {
      onEnd: () => {
        setOrbState('idle');
        if (!muted) startRecognizer();
      },
    });
  };

  const endSession = async () => {
    if (!session?.session_id) return navigate('/dashboard');
    stopRecognizer();
    stopSpeaking();
    try {
      await api.put(`/sessions/${session.session_id}/end`);
      localStorage.removeItem('drivoai_active_session');
      navigate(`/session/${session.session_id}/report`);
    } catch (e) {
      toast.error('Could not end session, try again');
    }
  };

  if (!session) return null;

  const persona = session.persona;
  const avatarSrc = persona
    ? persona.avatar_file_id ? fileUrl(persona.avatar_file_id) : avatarSeedUrl(persona.avatar_seed || persona.slug || persona.id)
    : null;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="hero-bg absolute inset-0 opacity-50" />
      {/* Top bar */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border" style={{ borderColor: 'var(--border)' }}>
            {avatarSrc && <AvatarImage src={avatarSrc} />}
            <AvatarFallback style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)' }}>{(persona?.name || 'AI').slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Active</p>
            <p className="font-display text-base leading-tight" data-testid="session-persona-name">{persona?.name || 'Unassigned'}</p>
          </div>
          <span className="h-2 w-2 rounded-full inline-block ml-2" style={{ background: orbState === 'listening' ? 'var(--accent)' : orbState === 'speaking' ? 'var(--primary)' : 'var(--text-muted)' }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="font-mono text-sm tabular-nums px-3 py-2 rounded-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} data-testid="session-timer">{fmtClock(timer)}</div>
          <div className="flex items-center gap-1 px-2 py-2 rounded-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} data-testid="session-language-toggle">
            <Globe2 className="h-3.5 w-3.5" style={{ color: 'var(--text-secondary)' }} />
            <button onClick={() => setLanguage('en')} className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: language === 'en' ? 'var(--primary)' : 'transparent', color: language === 'en' ? 'var(--bg)' : 'var(--text-secondary)' }}>EN</button>
            <button onClick={() => setLanguage('id')} className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: language === 'id' ? 'var(--primary)' : 'transparent', color: language === 'id' ? 'var(--bg)' : 'var(--text-secondary)' }}>ID</button>
          </div>
          <Button onClick={endSession} className="h-10" style={{ background: 'var(--danger)', color: 'var(--bg)' }} data-testid="session-end-button">
            <PhoneOff className="h-4 w-4 mr-2" /> End
          </Button>
        </div>
      </div>

      {/* Orb */}
      <div className="relative z-10 grid place-items-center px-4" style={{ minHeight: 'calc(100vh - 220px)' }}>
        <VoiceOrb state={orbState} size={Math.min(360, window.innerWidth - 80)} />
      </div>

      {/* Bottom dock */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 pb-6">
        <div className="card-surface px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-secondary)' }}>Last reply</p>
              <p className="text-sm mt-1 line-clamp-3" style={{ color: 'var(--text-primary)' }} data-testid="session-last-ai">{lastAI || (language === 'id' ? 'Mendengarkan…' : 'Listening…')}</p>
              {(interim || lastUser) && (
                <p className="text-xs mt-2 italic" style={{ color: 'var(--text-muted)' }} data-testid="session-last-user">you: {interim || lastUser}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => setMuted((m) => !m)}
                variant="outline"
                className="h-11 w-11 p-0"
                style={{ background: muted ? 'var(--danger)' : 'var(--surface-alt)', borderColor: 'var(--border)', color: muted ? 'var(--bg)' : 'var(--text-primary)' }}
                aria-label="mute"
                data-testid="session-mute-button"
              >
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button
                onClick={() => setShowFallback((s) => !s)}
                variant="outline"
                className="h-11 w-11 p-0"
                style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)' }}
                aria-label="text"
                data-testid="session-fallback-toggle"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {(showFallback || !hasRecognition) && (
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => { e.preventDefault(); if (fallbackText.trim()) { submitTurn(fallbackText.trim()); setFallbackText(''); } }}
            >
              <Input
                value={fallbackText}
                onChange={(e) => setFallbackText(e.target.value)}
                placeholder={language === 'id' ? 'Ketik pesan ke DrivoAI…' : 'Type a message to DrivoAI…'}
                className="h-11"
                style={{ background: 'var(--surface-alt)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                data-testid="session-fallback-input"
              />
              <Button type="submit" className="h-11 px-4" style={{ background: 'var(--primary)', color: 'var(--bg)' }} data-testid="session-fallback-send"><Send className="h-4 w-4" /></Button>
            </form>
          )}
          {!hasRecognition && (
            <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>Voice not supported in this browser. Use text input above.</p>
          )}
        </div>
      </div>

      <DrowsinessAlert visible={showAlert} severity={alertSeverity} language={language} onDismiss={() => setShowAlert(false)} />
    </div>
  );
}

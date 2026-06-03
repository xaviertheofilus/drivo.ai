// Web Speech API helpers for STT + TTS, bilingual EN/ID.

export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function speak(text, language = 'en', { onStart, onEnd, onError, rate, pitch, voiceName } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return null;
  try {
    window.speechSynthesis.cancel();
  } catch {}
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = language === 'id' ? 'id-ID' : 'en-US';
  utter.rate = typeof rate === 'number' ? rate : 1.0;
  utter.pitch = typeof pitch === 'number' ? pitch : 1.0;
  utter.volume = 1.0;

  // Try to pick a matching voice
  const voices = window.speechSynthesis.getVoices?.() || [];
  const norm = (s) => String(s || '').trim().toLowerCase();
  const want = norm(voiceName);
  const preferred = (
    (want ? voices.find((v) => norm(v.name) === want) : null)
    || (want ? voices.find((v) => norm(v.name).includes(want)) : null)
    || (want ? voices.find((v) => want.includes(norm(v.name)) && norm(v.name).length >= 6) : null)
    || voices.find((v) => v.lang === utter.lang)
    || voices.find((v) => v.lang?.toLowerCase?.() === utter.lang.toLowerCase())
    || voices.find((v) => (v.lang || '').toLowerCase().startsWith((utter.lang || '').split('-')[0].toLowerCase()))
  );
  if (preferred) utter.voice = preferred;

  if (onStart) utter.onstart = onStart;
  if (onEnd) utter.onend = onEnd;
  if (onError) utter.onerror = onError;
  window.speechSynthesis.speak(utter);
  return utter;
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch {}
}

export function createRecognizer({ language = 'en', onResult, onEnd, onError } = {}) {
  const SR = getSpeechRecognition();
  if (!SR) return null;
  const rec = new SR();
  rec.lang = language === 'id' ? 'id-ID' : 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  let lastInterim = '';

  rec.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) final += res[0].transcript;
      else interim += res[0].transcript;
    }
    lastInterim = interim;
    if (onResult) onResult({ interim, final });
  };
  rec.onerror = (e) => onError && onError(e);
  rec.onend = () => onEnd && onEnd({ lastInterim });
  return rec;
}

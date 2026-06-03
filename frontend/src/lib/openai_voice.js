// OpenAI Voice Service — WebRTC-based voice using OpenAI TTS/STT
// Replaces ElevenLabs SDK integration

let mediaRecorder = null;
let audioContext = null;
let audioChunks = [];

export async function initVoiceSession({ onAudioData, onDisconnect } = {}) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.start(100);

    return { stream, analyser, mediaRecorder };
  } catch (err) {
    console.error('Failed to init voice session:', err);
    throw err;
  }
}

export async function endVoiceSession() {
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (audioContext) {
      await audioContext.close();
      audioContext = null;
    }
    mediaRecorder = null;
    audioChunks = [];
  } catch (err) {
    console.error('Failed to end voice session:', err);
  }
}

export function getAudioLevel() {
  return 0;
}

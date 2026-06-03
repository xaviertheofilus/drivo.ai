// ElevenLabs Agents SDK integration for voice conversations
import { Conversation } from '@elevenlabs/client';

let conversationInstance = null;

export async function startElevenLabsSession({
  agentId,
  signedUrl,
  conversationToken,
  onConnect,
  onDisconnect,
  onMessage,
  onError,
  onStatusChange,
  onModeChange,
  onCanSendFeedbackChange,
  onAudioAlignment,
}) {
  if (conversationInstance) {
    await endElevenLabsSession();
  }

  const options = {};

  if (signedUrl) {
    options.signedUrl = signedUrl;
  } else if (conversationToken) {
    options.conversationToken = conversationToken;
  } else if (agentId) {
    options.agentId = agentId;
    options.connectionType = 'websocket';
  }

  if (onConnect) options.onConnect = onConnect;
  if (onDisconnect) options.onDisconnect = onDisconnect;
  if (onMessage) options.onMessage = onMessage;
  if (onError) options.onError = onError;
  if (onStatusChange) options.onStatusChange = onStatusChange;
  if (onModeChange) options.onModeChange = onModeChange;
  if (onCanSendFeedbackChange) options.onCanSendFeedbackChange = onCanSendFeedbackChange;
  if (onAudioAlignment) options.onAudioAlignment = onAudioAlignment;

  conversationInstance = await Conversation.startSession(options);
  return conversationInstance;
}

export async function endElevenLabsSession() {
  if (conversationInstance) {
    await conversationInstance.endSession();
    conversationInstance = null;
  }
}

export function getElevenLabsConversation() {
  return conversationInstance;
}

export async function setVolume(volume) {
  if (conversationInstance) {
    await conversationInstance.setVolume({ volume });
  }
}

export async function getInputVolume() {
  if (conversationInstance) {
    return await conversationInstance.getInputVolume();
  }
  return 0;
}

export async function getOutputVolume() {
  if (conversationInstance) {
    return await conversationInstance.getOutputVolume();
  }
  return 0;
}

export function sendFeedback(positive) {
  if (conversationInstance) {
    conversationInstance.sendFeedback(positive);
  }
}

export function sendContextualUpdate(text) {
  if (conversationInstance) {
    conversationInstance.sendContextualUpdate(text);
  }
}

export function sendUserMessage(text) {
  if (conversationInstance) {
    conversationInstance.sendUserMessage(text);
  }
}

export function sendUserActivity() {
  if (conversationInstance) {
    conversationInstance.sendUserActivity();
  }
}

export function setMicMuted(muted) {
  if (conversationInstance) {
    conversationInstance.setMicMuted(muted);
  }
}

export async function changeInputDevice(options) {
  if (conversationInstance) {
    await conversationInstance.changeInputDevice(options);
  }
}

export async function changeOutputDevice(options) {
  if (conversationInstance) {
    await conversationInstance.changeOutputDevice(options);
  }
}

export function getInputByteFrequencyData() {
  if (conversationInstance) {
    return conversationInstance.getInputByteFrequencyData();
  }
  return null;
}

export function getOutputByteFrequencyData() {
  if (conversationInstance) {
    return conversationInstance.getOutputByteFrequencyData();
  }
  return null;
}
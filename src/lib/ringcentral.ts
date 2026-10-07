/**
 * RingCentral Telephony Integration & Audio Engine
 * Provides client-side Web Audio telephony tones (Ringing, DTMF, Connect, Hangup)
 * and server-side RingCentral REST API interaction helpers.
 */

export interface RingCentralConfig {
  clientId: string;
  clientSecret: string;
  serverUrl: string;
  jwtToken?: string;
  mainPhoneNumber: string;
  isConfigured: boolean;
}

export function getRingCentralConfig(): RingCentralConfig {
  const clientId = process.env.RINGCENTRAL_CLIENT_ID || "";
  const clientSecret = process.env.RINGCENTRAL_CLIENT_SECRET || "";
  const serverUrl = process.env.RINGCENTRAL_SERVER_URL || "https://platform.devtest.ringcentral.com";
  const jwtToken = process.env.RINGCENTRAL_JWT || "";
  const mainPhoneNumber = process.env.RINGCENTRAL_MAIN_PHONE_NUMBER || "+1 (800) 555-0199";

  return {
    clientId,
    clientSecret,
    serverUrl,
    jwtToken,
    mainPhoneNumber,
    isConfigured: Boolean(clientId && (clientSecret || jwtToken)),
  };
}

// ----------------------------------------------------
// Web Audio API Telephony Tone Synthesizer (Clientside)
// ----------------------------------------------------

// DTMF standard frequencies (Hz)
const DTMF_FREQS: Record<string, [number, number]> = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
};

let audioCtx: AudioContext | null = null;
let ringInterval: NodeJS.Timeout | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn("Web Audio not supported or blocked by browser:", err);
    return null;
  }
}

/**
 * Play standard DTMF touch-tone for phone keypad buttons
 */
export function playDtmfTone(key: string, durationMs = 120) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const freqs = DTMF_FREQS[key] || [941, 1336];
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = "sine";
  osc2.type = "sine";
  osc1.frequency.setValueAtTime(freqs[0], now);
  osc2.frequency.setValueAtTime(freqs[1], now);

  gainNode.gain.setValueAtTime(0.08, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + durationMs / 1000);
  osc2.stop(now + durationMs / 1000);
}

/**
 * Play authentic dual-frequency US PBX telephone ringing sound (440Hz + 480Hz)
 */
export function startRingtoneLoop() {
  stopRingtoneLoop();
  const ctx = getAudioContext();
  if (!ctx) return;

  const playSingleRingBurst = () => {
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.setValueAtTime(0.12, now + 1.8);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);
    } catch {}
  };

  playSingleRingBurst();
  ringInterval = setInterval(() => {
    playSingleRingBurst();
  }, 4000);
}

/**
 * Stop any currently active ringing tone
 */
export function stopRingtoneLoop() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
}

/**
 * Play pleasant connection chime when call is answered
 */
export function playCallConnectedTone() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch {}
}

/**
 * Play call ended tone
 */
export function playCallEndedTone() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(480, now);
    osc2.frequency.setValueAtTime(620, now);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  } catch {}
}

/**
 * Play subtle audio chime for microphone mute / unmute toggle
 */
export function playMuteTone(isMuted: boolean) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Lower frequency tone when muting, higher cheerful tone when unmuting
    osc.frequency.setValueAtTime(isMuted ? 350 : 700, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  } catch {}
}

/**
 * Play pleasant two-tone chime when transferring a call
 */
export function playTransferTone() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.0, now + 0.12); // A5

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {}
}


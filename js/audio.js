let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, start, dur, type, gainPeak) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainPeak || 0.18, ctx.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

export function playCorrect() {
  tone(523.25, 0, 0.14, "triangle");
  tone(659.25, 0.1, 0.14, "triangle");
  tone(783.99, 0.2, 0.28, "triangle");
}

export function playWrong() {
  tone(180, 0, 0.18, "sawtooth", 0.14);
  tone(140, 0.09, 0.22, "sawtooth", 0.12);
}

export function unlockAudio() {
  getCtx();
}

// Tiny synthesized sound effects via the Web Audio API — no audio asset files.
// The AudioContext is created lazily and resumed on the first user gesture to
// satisfy mobile/desktop autoplay policies.

let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Call once on first pointer input so audio is unlocked.
export function unlockAudio() {
  ac();
}

export function setMuted(m) {
  muted = m;
}
export function isMuted() {
  return muted;
}

// A single oscillator "blip" with an exponential amplitude decay.
function blip({ freq = 440, type = "sine", dur = 0.15, gain = 0.2, slideTo = null }) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({ dur = 0.18, gain = 0.25, hp = 800 }) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t);
}

export const Sfx = {
  launch: () => blip({ freq: 520, slideTo: 160, type: "triangle", dur: 0.22, gain: 0.18 }),
  thud: () => blip({ freq: 140, slideTo: 70, type: "sine", dur: 0.14, gain: 0.22 }),
  woodBreak: () => noise({ dur: 0.16, gain: 0.18, hp: 500 }),
  glassBreak: () => noise({ dur: 0.22, gain: 0.16, hp: 2600 }),
  stoneBreak: () => noise({ dur: 0.2, gain: 0.2, hp: 240 }),
  splat: () => {
    blip({ freq: 380, slideTo: 90, type: "sawtooth", dur: 0.2, gain: 0.16 });
    noise({ dur: 0.12, gain: 0.12, hp: 600 });
  },
  ability: () => blip({ freq: 880, slideTo: 1500, type: "square", dur: 0.16, gain: 0.12 }),
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => blip({ freq: f, type: "triangle", dur: 0.18, gain: 0.18 }), i * 110)
    );
  },
  lose: () => {
    [392, 330, 262].forEach((f, i) =>
      setTimeout(() => blip({ freq: f, type: "sawtooth", dur: 0.22, gain: 0.16 }), i * 140)
    );
  },
  tap: () => blip({ freq: 660, type: "square", dur: 0.06, gain: 0.08 }),
};

'use client';
// Suara prosedural via WebAudio: tanpa file audio, tanpa unduhan tambahan.
// AudioContext baru dibuat setelah gestur pertama pengguna (aturan autoplay browser).

const KEY = 'lorekeeper:sound';
let ctx = null;
let master, sfxBus, musBus, noiseBuf;
let prefs = { sfx: 0.7, music: 0.35 };
let music = null; // { biome, timer, nodes }
let wantBiome = null;
const subs = new Set();

try {
  const v = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (v && typeof v.sfx === 'number') prefs = { sfx: v.sfx, music: v.music ?? 0.35 };
} catch {}

export const getSoundPrefs = () => ({ ...prefs });
export function setSoundPrefs(p) {
  prefs = { ...prefs, ...p };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
  if (ctx) {
    sfxBus.gain.value = prefs.sfx;
    musBus.gain.value = prefs.music;
    if (prefs.music <= 0) stopMusic();
    else if (wantBiome && !music) playMusic(wantBiome);
  }
  subs.forEach((f) => f(prefs));
}
export const onSoundPrefs = (f) => (subs.add(f), () => subs.delete(f));

function init() {
  if (ctx || typeof window === 'undefined') return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = prefs.sfx;
  sfxBus.connect(master);
  musBus = ctx.createGain();
  musBus.gain.value = prefs.music;
  musBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
  return ctx;
}

/** Panggil sekali di sisi client: membuka audio pada klik/tap pertama. */
export function armAudio() {
  if (typeof window === 'undefined') return;
  const go = () => {
    init();
    ctx?.resume();
    if (wantBiome && !music) playMusic(wantBiome);
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go);
  window.addEventListener('keydown', go);
}

// --- primitif ---
function tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0, attack = 0.005, bus } = {}) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(bus || sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.25, freq = 1200, q = 1, type = 'bandpass', delay = 0, sweep = 0 } = {}) {
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq + sweep), t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f).connect(g).connect(sfxBus);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}
const arp = (notes, step, opts) => notes.forEach((n, i) => tone(n, opts?.dur || step * 1.6, { ...opts, delay: i * step }));

const SFX = {
  swing: () => noise(0.16, { vol: 0.22, freq: 2600, sweep: -1800, q: 0.8 }),
  bow: () => (tone(900, 0.08, { type: 'triangle', vol: 0.12, slide: -500 }), noise(0.12, { vol: 0.12, freq: 4000, sweep: -2500 })),
  spell: () => (tone(440, 0.35, { type: 'sine', vol: 0.12, slide: 660 }), tone(660, 0.3, { type: 'triangle', vol: 0.08, slide: 880, delay: 0.05 })),
  cast: () => arp([523, 659, 784], 0.06, { type: 'sine', vol: 0.1 }),
  breath: () => noise(0.6, { vol: 0.3, freq: 500, sweep: -300, q: 0.6, type: 'lowpass' }),
  hit: () => (noise(0.09, { vol: 0.35, freq: 900, q: 0.7 }), tone(140, 0.12, { type: 'square', vol: 0.15, slide: -80 })),
  crit: () => (noise(0.18, { vol: 0.45, freq: 700, q: 0.6 }), tone(220, 0.25, { type: 'sawtooth', vol: 0.18, slide: -150 }), tone(880, 0.12, { type: 'square', vol: 0.08, delay: 0.04 })),
  block: () => tone(1400, 0.12, { type: 'triangle', vol: 0.12, slide: -300 }),
  miss: () => noise(0.2, { vol: 0.12, freq: 3000, sweep: -2600, q: 0.5 }),
  heal: () => arp([660, 880, 1046], 0.07, { type: 'sine', vol: 0.1 }),
  down: () => tone(300, 0.5, { type: 'triangle', vol: 0.16, slide: -220 }),
  die: () => (noise(0.3, { vol: 0.2, freq: 400, sweep: -250 }), tone(180, 0.4, { type: 'square', vol: 0.1, slide: -120 })),
  death: () => arp([392, 311, 233, 175], 0.18, { type: 'triangle', vol: 0.14, dur: 0.4 }),
  spawn: () => tone(110, 0.3, { type: 'sawtooth', vol: 0.08, slide: 60 }),
  boss: () => (tone(55, 1.2, { type: 'sawtooth', vol: 0.18, slide: 30, attack: 0.2 }), tone(82, 1.2, { type: 'square', vol: 0.08, attack: 0.3 }), noise(1, { vol: 0.12, freq: 200, type: 'lowpass' })),
  coin: () => (tone(988, 0.08, { type: 'square', vol: 0.08 }), tone(1319, 0.2, { type: 'square', vol: 0.08, delay: 0.07 })),
  item: () => arp([784, 988, 1175], 0.05, { type: 'square', vol: 0.07 }),
  rare: () => arp([523, 659, 784, 1046, 1319], 0.07, { type: 'square', vol: 0.08, dur: 0.3 }),
  quest: () => arp([523, 659, 784, 1046], 0.11, { type: 'triangle', vol: 0.14, dur: 0.4 }),
  levelup: () => arp([392, 523, 659, 784, 1046], 0.08, { type: 'square', vol: 0.09, dur: 0.25 }),
  save: () => tone(660, 0.18, { type: 'triangle', vol: 0.12 }),
  fail: () => tone(196, 0.25, { type: 'square', vol: 0.1, slide: -40 }),
  dice: () => {
    for (let i = 0; i < 6; i++) noise(0.04, { vol: 0.18, freq: 1800 + Math.random() * 1500, q: 3, delay: i * 0.06 + Math.random() * 0.02 });
  },
  nat20: () => arp([523, 784, 1046, 1568], 0.06, { type: 'square', vol: 0.1, dur: 0.35 }),
  nat1: () => tone(196, 0.6, { type: 'sawtooth', vol: 0.1, slide: -120 }),
  ui: () => tone(1200, 0.04, { type: 'square', vol: 0.05 }),
  chat: () => tone(1568, 0.06, { type: 'sine', vol: 0.06 }),
  turn: () => (tone(587, 0.12, { type: 'triangle', vol: 0.1 }), tone(880, 0.18, { type: 'triangle', vol: 0.1, delay: 0.1 })),
};

let last = {};
export function sfx(name) {
  if (!ctx || ctx.state !== 'running' || prefs.sfx <= 0 || !SFX[name]) return;
  const now = performance.now();
  if (now - (last[name] || 0) < 45) return; // cegah tumpukan suara identik
  last[name] = now;
  try {
    SFX[name]();
  } catch {}
}

// --- musik ambient per biome: drone + arpeggio pentatonik, dijadwalkan per bar ---
const SCALES = {
  forest: { root: 196, mode: [0, 3, 5, 7, 10], tempo: 0.42, wave: 'triangle' },
  cave: { root: 110, mode: [0, 1, 5, 7, 8], tempo: 0.6, wave: 'sine' },
  coast: { root: 220, mode: [0, 2, 4, 7, 9], tempo: 0.5, wave: 'sine' },
  snow: { root: 147, mode: [0, 3, 5, 6, 10], tempo: 0.38, wave: 'triangle' },
  swamp: { root: 123, mode: [0, 3, 6, 7, 10], tempo: 0.55, wave: 'triangle' },
  castle: { root: 98, mode: [0, 1, 3, 7, 8], tempo: 0.45, wave: 'sawtooth' },
  combat: { root: 110, mode: [0, 3, 5, 6, 7], tempo: 0.22, wave: 'square' },
};
const hz = (root, semi) => root * Math.pow(2, semi / 12);

export function playMusic(biome) {
  wantBiome = biome;
  if (!ctx || prefs.music <= 0) return;
  if (music?.biome === biome) return;
  stopMusic();
  const S = SCALES[biome] || SCALES.forest;
  const drone = ctx.createOscillator();
  const dg = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  drone.type = S.wave === 'square' ? 'sawtooth' : S.wave;
  drone.frequency.value = S.root / 2;
  dg.gain.value = 0;
  dg.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 2);
  drone.connect(lp).connect(dg).connect(musBus);
  drone.start();
  let step = 0;
  let nextAt = ctx.currentTime + 0.3;
  const tick = () => {
    if (!ctx) return;
    while (nextAt < ctx.currentTime + 1.2) {
      const bar = Math.floor(step / 8);
      const prob = biome === 'combat' ? 0.85 : 0.55;
      if (Math.random() < prob) {
        const deg = S.mode[(step * 3 + bar + Math.floor(Math.random() * 3)) % S.mode.length];
        const oct = Math.random() < 0.25 ? 12 : 0;
        tone(hz(S.root, deg + oct), S.tempo * 1.8, { type: S.wave, vol: S.wave === 'sawtooth' || S.wave === 'square' ? 0.025 : 0.05, delay: nextAt - ctx.currentTime, attack: 0.03, bus: musBus });
      }
      if (biome === 'combat' && step % 2 === 0) {
        const t = nextAt - ctx.currentTime;
        tone(S.root / 2, 0.12, { type: 'sine', vol: 0.12, slide: -30, delay: t, bus: musBus });
      }
      step++;
      nextAt += S.tempo;
    }
  };
  tick();
  const timer = setInterval(tick, 400);
  music = { biome, timer, drone, dg };
}

export function stopMusic() {
  if (!music || !ctx) return (music = null);
  clearInterval(music.timer);
  const { drone, dg } = music;
  dg.gain.cancelScheduledValues(ctx.currentTime);
  dg.gain.setValueAtTime(dg.gain.value, ctx.currentTime);
  dg.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
  drone.stop(ctx.currentTime + 0.9);
  music = null;
}

/** Kecilkan musik saat narasi suara berbicara. */
export function duckMusic(on) {
  if (!ctx) return;
  musBus.gain.cancelScheduledValues(ctx.currentTime);
  musBus.gain.setTargetAtTime(on ? prefs.music * 0.25 : prefs.music, ctx.currentTime, 0.25);
}

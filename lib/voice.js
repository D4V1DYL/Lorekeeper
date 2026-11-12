'use client';
// Narasi suara gratis memakai Web Speech API bawaan browser (speechSynthesis).
// Tanpa API key, tanpa server, tanpa extension. Suara yang tersedia tergantung perangkat
// (Chrome/Edge di Windows & Android biasanya punya suara Bahasa Indonesia dan Inggris).
import { duckMusic } from './sound';

const KEY = 'lorekeeper:voice';
let prefs = { auto: false, rate: 1, engine: 'auto', voice: { id: '', en: '' } };
let serverTts = false; // server punya Piper (diumumkan lewat room.dm.tts)
const q = []; // antrean audio server: { audio, text, lang, id }
let current = null;
const subs = new Set();
let speakingId = null;
let pending = 0;

try {
  const v = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (v) prefs = { ...prefs, ...v, voice: { ...prefs.voice, ...(v.voice || {}) } };
} catch {}

const deviceTts = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
export const ttsSupported = () => serverTts || deviceTts();
export const hasServerTts = () => serverTts;
export function setServerTts(v) {
  if (serverTts === !!v) return;
  serverTts = !!v;
  notify();
}
const useServer = () => serverTts && prefs.engine !== 'device';
export const getVoicePrefs = () => ({ ...prefs, voice: { ...prefs.voice } });
const notify = () => subs.forEach((f) => f({ ...prefs, speakingId }));
export const onVoice = (f) => (subs.add(f), () => subs.delete(f));

export function setVoicePrefs(p) {
  prefs = { ...prefs, ...p, voice: { ...prefs.voice, ...(p.voice || {}) } };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {}
  if (p.auto === false) stopSpeaking();
  notify();
}

/** Daftar suara untuk satu bahasa (id/en). Suara lokal didahulukan. */
export function voicesFor(lang) {
  if (!deviceTts()) return [];
  const want = lang === 'en' ? 'en' : 'id';
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(want) || (want === 'id' && /^in[-_]/i.test(v.lang)))
    .sort((a, b) => (b.localService ? 1 : 0) - (a.localService ? 1 : 0) || (/natural|online|google|neural/i.test(b.name) ? 1 : 0) - (/natural|online|google|neural/i.test(a.name) ? 1 : 0));
}

function pickVoice(lang) {
  const list = voicesFor(lang);
  const want = prefs.voice[lang === 'en' ? 'en' : 'id'];
  return list.find((v) => v.voiceURI === want) || list[0] || null;
}

/** Bersihkan markdown dan potong jadi kalimat pendek (Chrome memotong ucapan yang terlalu panjang). */
export function toSentences(text) {
  const clean = String(text || '')
    .replace(/^\s*(?:>>|»)\s*/gm, '')
    .replace(/\*\*?|__|`|#+\s/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?…]+(?:[.!?…]+["'”’)]*|$)/g) || [clean];
  const out = [];
  for (let s of parts) {
    s = s.trim();
    if (!s) continue;
    while (s.length > 220) {
      const cut = s.lastIndexOf(',', 200) > 60 ? s.lastIndexOf(',', 200) + 1 : 200;
      out.push(s.slice(0, cut).trim());
      s = s.slice(cut).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

function started(id) {
  speakingId = id;
  duckMusic(true);
  notify();
}
function finished() {
  speakingId = null;
  duckMusic(false);
  notify();
}

// --- mesin server (Piper): tiap kalimat jadi satu file WAV yang di-cache server ---
const audioOf = (it) => {
  if (!it.audio) {
    it.audio = new Audio(`/api/tts?lang=${it.lang}&t=${encodeURIComponent(it.text)}`);
    it.audio.preload = 'auto';
  }
  return it.audio;
};

function pump() {
  if (current || !q.length) return;
  current = q.shift();
  const a = audioOf(current);
  if (q[0]) audioOf(q[0]); // unduh kalimat berikutnya selagi yang ini diputar
  a.playbackRate = prefs.rate;
  started(current.id);
  const next = () => {
    current = null;
    if (q.length) pump();
    else finished();
  };
  a.onended = next;
  a.onerror = () => {
    // server gagal untuk kalimat ini: bacakan dengan suara perangkat
    const it = current;
    current = null;
    if (deviceTts() && it) speakDevice(it.text, { lang: it.lang, id: it.id });
    if (q.length) pump();
    else if (!deviceTts()) finished();
  };
  a.play().catch(a.onerror);
}

function speakServer(text, { lang, id }) {
  for (const s of toSentences(text)) q.push({ audio: null, text: s, lang, id });
  pump();
}

/** Antrekan teks untuk dibacakan. id = id entri log (untuk tombol play/stop per paragraf). */
export function speak(text, opts = {}) {
  const o = { lang: opts.lang === 'en' ? 'en' : 'id', id: opts.id ?? null };
  if (useServer()) return speakServer(text, o);
  if (deviceTts()) speakDevice(text, o);
}

function speakDevice(text, { lang = 'id', id = null } = {}) {
  const voice = pickVoice(lang);
  for (const s of toSentences(text)) {
    const u = new SpeechSynthesisUtterance(s);
    u.lang = voice?.lang || (lang === 'en' ? 'en-US' : 'id-ID');
    if (voice) u.voice = voice;
    u.rate = prefs.rate;
    u.onstart = () => started(id);
    u.onend = u.onerror = () => {
      pending = Math.max(0, pending - 1);
      if (!pending) finished();
    };
    pending++;
    speechSynthesis.speak(u);
  }
  // Chrome kadang "tertidur" setelah tab pindah; resume menjaga antrean tetap jalan
  speechSynthesis.resume();
}

export function stopSpeaking() {
  for (const it of q.splice(0)) if (it.audio) it.audio.src = '';
  if (current) {
    current.audio.onended = current.audio.onerror = null;
    current.audio.pause();
    current = null;
  }
  if (deviceTts()) {
    pending = 0;
    speechSynthesis.cancel();
  }
  finished();
}

export const isSpeaking = (id) => speakingId === id;

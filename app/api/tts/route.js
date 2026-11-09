// Proxy narasi suara ke server Piper (opsional, gratis, jalan di CPU sendiri).
// GET /api/tts?lang=id&t=<kalimat>  →  audio/wav
// Hasil di-cache di memori dan permintaan yang sama dari banyak pemain digabung jadi satu sintesis.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PIPER_URL = process.env.PIPER_URL || '';
const VOICE = { id: process.env.PIPER_VOICE_ID || 'id_ID-news_tts-medium', en: process.env.PIPER_VOICE_EN || 'en_US-ryan-medium' };
const MAX_CACHE = 160;
const cache = new Map(); // key -> Buffer (urutan = LRU)
const inflight = new Map(); // key -> Promise<Buffer>
const hits = new Map(); // ip -> [timestamps]

function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 2000) hits.clear();
  return arr.length > 90; // ±1,5 kalimat/detik per IP sudah lebih dari cukup
}

async function synth(text, lang) {
  const res = await fetch(PIPER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: VOICE[lang] }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`piper ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function GET(req) {
  if (!PIPER_URL) return new Response('tts off', { status: 404 });
  const url = new URL(req.url);
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'id';
  const text = String(url.searchParams.get('t') || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (!text) return new Response('empty', { status: 400 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  const key = `${lang}|${text}`;

  let buf = cache.get(key);
  if (buf) {
    cache.delete(key);
    cache.set(key, buf);
  } else {
    if (limited(ip)) return new Response('slow down', { status: 429 });
    let p = inflight.get(key);
    if (!p) {
      p = synth(text, lang).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    try {
      buf = await p;
    } catch (e) {
      return new Response(String(e.message || e), { status: 502 });
    }
    cache.set(key, buf);
    while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value);
  }
  return new Response(buf, { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'public, max-age=86400' } });
}

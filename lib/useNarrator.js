'use client';
import { useEffect, useRef, useState } from 'react';
import { getVoicePrefs, onVoice, setServerTts, speak, stopSpeaking, toSentences, ttsSupported } from './voice';

/**
 * Bacakan narasi DM secara otomatis (bila diaktifkan), kalimat demi kalimat selagi streaming,
 * jadi suara mulai sebelum DM selesai menulis. Entri lama tidak dibacakan ulang saat masuk room.
 */
export function useNarrator(room) {
  const [prefs, setPrefs] = useState(() => getVoicePrefs());
  const spoken = useRef(null); // Map id -> jumlah kalimat yang sudah diantrekan
  const lang = room?.settings?.language === 'en' ? 'en' : 'id';

  useEffect(() => onVoice((p) => setPrefs(p)), []);
  useEffect(() => setServerTts(!!room?.dm?.tts), [room?.dm?.tts]);
  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    if (!room) return;
    const dms = room.log.filter((e) => e.type === 'dm');
    // pertama kali / baru diaktifkan: tandai semua yang sudah selesai sebagai "sudah dibaca"
    if (!spoken.current || !prefs.auto) {
      const m = new Map();
      for (const e of dms) if (!e.streaming) m.set(e.id, Infinity);
      spoken.current = m;
      if (!prefs.auto) return;
    }
    if (!ttsSupported()) return;
    for (const e of dms) {
      const done = spoken.current.get(e.id) ?? 0;
      if (done === Infinity) continue;
      const all = toSentences(e.text);
      // saat streaming, kalimat terakhir mungkin belum lengkap: tahan dulu
      const ready = e.streaming ? Math.max(0, all.length - 1) : all.length;
      if (ready > done) speak(all.slice(done, ready).join(' '), { lang, id: e.id });
      spoken.current.set(e.id, e.streaming ? ready : Infinity);
    }
  }, [room, prefs.auto, lang]);

  return prefs;
}

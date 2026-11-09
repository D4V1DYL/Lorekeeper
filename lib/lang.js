'use client';
import { useSyncExternalStore } from 'react';
import { dataT, normLang, t } from './i18n';

const KEY = 'lorekeeper:lang';
const listeners = new Set();

/** Bahasa UI milik pemain ini (bukan bahasa narasi room). Default: bahasa browser. */
export function readLang() {
  if (typeof window === 'undefined') return 'id';
  try {
    const v = localStorage.getItem(KEY);
    if (v) return normLang(v);
  } catch {}
  return /^(id|ms)/i.test(navigator.language || '') ? 'id' : 'en';
}

export function setLang(lang) {
  lang = normLang(lang);
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
  import('./client').then(({ getSocket }) => getSocket().emit('lang:set', { lang }));
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export function useLang() {
  const lang = useSyncExternalStore(subscribe, readLang, () => 'id');
  return { lang, T: (key, vars) => t(lang, key, vars), D: dataT(lang), setLang };
}

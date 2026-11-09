'use client';
import { io } from 'socket.io-client';

let socket;
export function getSocket() {
  if (!socket) {
    let lang = 'id';
    try {
      lang = localStorage.getItem('lorekeeper:lang') || (/^(id|ms)/i.test(navigator.language || '') ? 'id' : 'en');
    } catch {}
    socket = io({ transports: ['websocket', 'polling'], auth: { lang } });
  }
  return socket;
}

export function emit(event, payload) {
  return new Promise((resolve) => {
    getSocket().emit(event, payload ?? {}, (res) => resolve(res || { ok: false, error: 'Tidak ada respons' }));
  });
}

const key = (code) => `lorekeeper:${String(code).toUpperCase()}`;
export function loadSession(code) {
  try {
    return JSON.parse(localStorage.getItem(key(code)) || 'null');
  } catch {
    return null;
  }
}
export function saveSession(code, data) {
  try {
    localStorage.setItem(key(code), JSON.stringify(data));
  } catch {}
}
export function clearSession(code) {
  try {
    localStorage.removeItem(key(code));
  } catch {}
}
export function lastName() {
  try {
    return localStorage.getItem('lorekeeper:name') || '';
  } catch {
    return '';
  }
}
export function rememberName(n) {
  try {
    localStorage.setItem('lorekeeper:name', n);
  } catch {}
}

// ---- mode grafis hemat (untuk HP/laptop kentang) ----
const LP_KEY = 'lorekeeper:lowpower';
export function autoLowPower() {
  if (typeof navigator === 'undefined') return false;
  const mem = navigator.deviceMemory, cores = navigator.hardwareConcurrency, save = navigator.connection?.saveData;
  return !!save || (mem && mem <= 2) || (cores && cores <= 2);
}
export function getLowPower() {
  try {
    const v = localStorage.getItem(LP_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {}
  return autoLowPower();
}
export function setLowPower(on) {
  try {
    localStorage.setItem(LP_KEY, on ? '1' : '0');
  } catch {}
  applyLowPowerClass(on);
}
export function applyLowPowerClass(on) {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('lowfx', !!on);
}

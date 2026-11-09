'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Dices, Map as MapIcon, MessagesSquare, ScrollText, Skull } from 'lucide-react';
import { useLang } from '@/lib/lang';

const KEY = 'lorekeeper:tutorial';
const ICONS = [ScrollText, Dices, Dices, MessagesSquare, Skull];

export const tutorialSeen = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
};

/** 5 kartu singkat cara bermain. Muncul otomatis sekali, bisa dibuka lagi dari menu. */
export default function Tutorial({ open, onClose }) {
  const { T } = useLang();
  const [i, setI] = useState(0);
  const close = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    setI(0);
    onClose();
  };
  const Icon = ICONS[i] || MapIcon;
  const last = i === 4;
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="panel w-full max-w-md rounded-2xl p-6" role="dialog" aria-modal="true">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                <Icon size={30} className="text-ember" />
                <h2 className="mt-3 font-display text-2xl font-bold text-gold">{T(`tut.${i + 1}t`)}</h2>
                <p className="mt-2 font-story text-lg leading-snug text-parch/90">{T(`tut.${i + 1}d`)}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((k) => (
                  <button key={k} onClick={() => setI(k)} aria-label={`${k + 1}`} className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-ember' : 'w-2 bg-gold/25'}`} />
                ))}
              </div>
              {!last && (
                <button onClick={close} className="ml-auto text-sm text-parch-dim hover:text-parch">
                  {T('tut.skip')}
                </button>
              )}
              <button
                autoFocus
                onClick={() => (last ? close() : setI(i + 1))}
                className={`${last ? 'ml-auto' : ''} rounded-lg bg-gradient-to-b from-ember to-[#c4621f] px-4 py-2 font-display text-sm font-bold text-ink`}
              >
                {last ? T('tut.done') : T('tut.next')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

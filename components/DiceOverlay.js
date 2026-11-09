'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import D20 from './D20';
import { fmtMod } from '@/lib/data';
import { useLang } from '@/lib/lang';
import { sfx } from '@/lib/sound';

// Overlay dadu yang berputar lalu mendarat. Di-lazy-load dari RoomClient.
export default function DiceOverlay({ roll, onDone }) {
  const { T } = useLang();
  const [face, setFace] = useState(null);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!roll) return;
    setLanded(false);
    sfx('dice');
    const spin = setInterval(() => setFace(1 + Math.floor(Math.random() * 20)), 60);
    const land = setTimeout(() => {
      clearInterval(spin);
      setFace(roll.d20);
      setLanded(true);
      sfx(roll.d20 === 20 ? 'nat20' : roll.d20 === 1 ? 'nat1' : roll.success ? 'save' : 'fail');
    }, 900);
    const done = setTimeout(onDone, 3000);
    return () => {
      clearInterval(spin);
      clearTimeout(land);
      clearTimeout(done);
    };
  }, [roll, onDone]);

  const crit = roll?.d20 === 20;
  const fumble = roll?.d20 === 1;
  const tone = !landed ? '#d9a94e' : crit ? '#f6dfa4' : fumble ? '#d0473f' : roll?.success ? '#7cbf73' : '#d0473f';

  return (
    <AnimatePresence>
      {roll && (
        <motion.div
          key={roll.key}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDone}
        >
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <p className="font-display text-sm tracking-[0.3em] text-parch-dim uppercase">
              {roll.name} · {roll.stat === 'DEATH' ? T('dice.death') : roll.stat} {roll.reason ? `· ${roll.reason}` : ''}
            </p>
            <motion.div
              initial={{ rotate: -540, scale: 0.3, y: -160 }}
              animate={{ rotate: 0, scale: landed ? [1.25, 1] : 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
            >
              <D20 value={face} size={180} tone={tone} glow={landed && (crit || fumble)} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: landed ? 1 : 0, y: landed ? 0 : 12 }} className="space-y-1">
              <p className="font-display text-3xl font-bold" style={{ color: tone }}>
                {crit ? T('dice.nat20') : fumble ? T('dice.nat1') : roll.success ? T('log.success') : T('log.fail')}
              </p>
              <p className="text-parch-dim">
                {roll.d20} {fmtMod(roll.mod)} = <span className="font-semibold text-parch">{roll.total}</span> vs DC {roll.dc}
                {roll.lucky && <span className="ml-2 text-gold">· Halfling Lucky!</span>}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

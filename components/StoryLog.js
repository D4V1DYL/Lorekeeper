'use client';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment, memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Dices, MessageCircle, Square, Volume2 } from 'lucide-react';
import { onVoice, speak, stopSpeaking, ttsSupported } from '@/lib/voice';
import { splitNarration } from '@/lib/npcLines';
import NpcAvatar from './NpcAvatar';
import { CLASSES, fmtMod } from '@/lib/data';
import { useLang } from '@/lib/lang';

// Render **tebal** dan *miring* tanpa dangerouslySetInnerHTML.
function inline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-parch">{p.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

function Narration({ text, streaming, dropcap = true }) {
  const { T } = useLang();
  const paras = String(text || '')
    .replace(/^#+\s*/gm, '')
    .split(/\n{2,}|\n(?=\S)/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={`${dropcap ? 'dropcap ' : ''}space-y-3 font-story text-[1.2rem] leading-relaxed text-parch/95 sm:text-[1.3rem]`}>
      {paras.length === 0 && streaming && <p className="glow-pulse text-parch-dim italic">{T('log.inking')}</p>}
      {paras.map((p, i) => (
        <p key={i} className={streaming && i === paras.length - 1 ? 'caret' : ''}>
          {inline(p)}
        </p>
      ))}
    </div>
  );
}

/** Tombol dengarkan per narasi: bisa membaca, bisa juga mendengar. */
function Listen({ e, lang }) {
  const { T } = useLang();
  const [speaking, setSpeaking] = useState(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(ttsSupported());
    return onVoice((p) => setSpeaking(p.speakingId));
  }, []);
  if (!ok || e.streaming || !e.text) return null;
  const on = speaking === e.id;
  return (
    <button
      type="button"
      onClick={() => {
        stopSpeaking();
        if (!on) speak(e.text, { lang, id: e.id });
      }}
      title={on ? T('voice.stop') : T('voice.listen')}
      aria-label={on ? T('voice.stop') : T('voice.listen')}
      className={`absolute -top-3 right-4 flex items-center gap-1 rounded-full border bg-ink px-2 py-0.5 text-[11px] ${on ? 'border-ember text-ember' : 'border-gold/30 text-parch-dim hover:text-gold'}`}
    >
      {on ? <Square size={10} /> : <Volume2 size={12} />} {on ? T('voice.stop') : T('voice.listen')}
    </button>
  );
}

const Entry = memo(function Entry({ e, colorOf, lang, npcs = [] }) {
  const { T } = useLang();
  switch (e.type) {
    case 'dm': {
      // narasi di kartu DM, dialog NPC jadi gelembung chat dengan avatar sendiri
      const parts = splitNarration(e.text, e.streaming);
      if (!parts.length) parts.push({ kind: 'narr', text: '' });
      let first = true;
      return (
        <div className="space-y-3">
          {parts.map((s, i) => {
            const last = i === parts.length - 1;
            if (s.kind === 'npc') {
              const info = npcs.find((n) => n.name.toLowerCase() === s.name.toLowerCase()) || {};
              return (
                <div key={i} className="flex items-end gap-2.5 pr-8">
                  <NpcAvatar name={s.name} role={info.role} attitude={info.attitude} size={40} />
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-gold/20 bg-[#221a14] px-4 py-2.5">
                    <p className="flex items-center gap-1.5 font-display text-xs font-bold tracking-wider text-gold">
                      {s.name}
                      {info.role && <span className="font-sans text-[10px] font-normal tracking-normal text-parch-dim">· {info.role}</span>}
                    </p>
                    <p className={`font-story text-lg leading-snug text-parch ${e.streaming && last ? 'caret' : ''}`}>“{s.text}”</p>
                  </div>
                </div>
              );
            }
            const head = first;
            first = false;
            return (
              <article key={i} className="relative rounded-2xl border border-gold/15 bg-gradient-to-b from-[#1d1713]/90 to-[#14100d]/90 px-5 py-5 shadow-[0_20px_50px_-30px_black] sm:px-7">
                {head && (
                  <>
                    <span className="absolute -top-2.5 left-5 rounded-full border border-gold/30 bg-ink px-2.5 py-0.5 font-display text-[10px] tracking-[0.3em] text-gold uppercase">{T('log.dm')}</span>
                    <Listen e={e} lang={lang} />
                  </>
                )}
                <Narration text={s.text} streaming={e.streaming && last} dropcap={head} />
              </article>
            );
          })}
        </div>
      );
    }
    case 'action':
      return (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm border bg-ink/60 px-4 py-2.5" style={{ borderColor: `${colorOf(e.author)}55` }}>
            <p className="flex flex-wrap items-center gap-x-2 font-display text-xs font-bold tracking-wider" style={{ color: colorOf(e.author) }}>
              {e.author}
              {e.data?.skill && (
                <span className="rounded-full border border-ember/40 bg-ember/10 px-2 py-px font-sans text-[10px] font-semibold tracking-normal text-ember">
                  ⚔ {e.data.skill}
                  {e.data.target ? ` → ${e.data.target}` : ''}
                </span>
              )}
            </p>
            <p className="font-story text-lg leading-snug text-parch/90">{e.text}</p>
          </div>
        </div>
      );
    case 'roll': {
      const r = e.data;
      const tone = r.d20 === 20 ? 'text-gold border-gold/50' : r.d20 === 1 ? 'text-blood border-blood/50' : r.success ? 'text-moss border-moss/40' : 'text-blood border-blood/40';
      return (
        <div className="flex justify-center">
          <div className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border bg-ink/70 px-4 py-1.5 text-sm ${tone}`}>
            <Dices size={14} />
            <span className="font-semibold text-parch">{r.name}</span>
            <span className="text-parch-dim">
              {r.stat}
              {r.reason ? ` · ${r.reason}` : ''}
            </span>
            <span className="text-parch">
              d20 <b>{r.d20}</b> {fmtMod(r.mod)} = <b>{r.total}</b> vs DC {r.dc}
            </span>
            <span className="font-display font-bold">{r.d20 === 20 ? T('log.crit') : r.d20 === 1 ? T('log.fumble') : r.success ? T('log.success') : T('log.fail')}</span>
            {r.auto && <span className="text-xs text-parch-dim">{T('log.byHost')}</span>}
          </div>
        </div>
      );
    }
    case 'freeroll': {
      const r = e.data;
      return (
        <p className="text-center text-sm text-parch-dim">
          <Dices size={13} className="mr-1 inline" />
          {T('log.rolled', { name: e.author, expr: r.expr })} [{r.dice.join(', ')}]{r.bonus ? ` ${fmtMod(r.bonus)}` : ''} = <b className="text-parch">{r.total}</b>
        </p>
      );
    }
    case 'combat': {
      const t = e.text || '';
      const crit = /KRITIS|CRITICAL/.test(t), miss = /MELESET|MISS/.test(t), kill = /kalah!|tumbang!|defeated!|is down!/.test(t), heal = /pulih|recovers/.test(t), lvl = /naik ke level|reached level/.test(t);
      const tone = lvl ? 'text-arcane border-arcane/40' : crit ? 'text-gold border-gold/50' : kill ? 'text-ember border-ember/40' : heal ? 'text-moss border-moss/40' : miss ? 'text-parch-dim border-gold/10' : e.enemy ? 'text-blood border-blood/30' : 'text-parch/90 border-gold/15';
      return (
        <div className="flex justify-center">
          <p className={`max-w-[95%] rounded-lg border bg-ink/60 px-3 py-1 text-center text-[13px] ${tone}`}>
            <Dices size={12} className="mr-1.5 inline opacity-70" />
            {t}
          </p>
        </div>
      );
    }
    case 'chat':
      return (
        <p className="text-sm text-parch-dim">
          <MessageCircle size={13} className="mr-1 inline opacity-60" />
          <span className="font-semibold" style={{ color: colorOf(e.author) }}>
            {e.author}
          </span>
          <span className="mx-1 text-[10px] tracking-widest opacity-60">OOC</span>
          {e.text}
        </p>
      );
    default:
      return <p className="text-center font-story text-base text-parch-dim italic">{e.text}</p>;
  }
});

export default function StoryLog({ log, players, lang = 'id', npcs = [] }) {
  const ref = useRef(null);
  const stick = useRef(true);
  const colorOf = (name) => {
    const p = players.find((x) => x.character?.name === name || x.name === name);
    return p?.character ? CLASSES[p.character.classId].color : '#a8977a';
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => (stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const lastText = log[log.length - 1]?.text;
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [log.length, lastText]);

  return (
    <div ref={ref} className="scroll-thin h-full overflow-y-auto px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <AnimatePresence initial={false}>
          {log.map((e) => (
            <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <Entry e={e} colorOf={colorOf} lang={lang} npcs={npcs} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dices, MessagesSquare, Send, Target } from 'lucide-react';
import { CLASSES, fmtMod, skillsFor } from '@/lib/data';
import { emit, getSocket } from '@/lib/client';
import { useLang } from '@/lib/lang';

/**
 * Chat tim (di luar cerita, tidak dibaca DM). Ada rencana tim, pesan cepat, indikator mengetik, dan /roll.
 */
export default function ChatPanel({ room, me, className = '' }) {
  const [text, setText] = useState('');
  const [typing, setTyping] = useState({});
  const [error, setError] = useState('');
  const list = useRef(null);
  const lastTyping = useRef(0);
  const { T, D, lang } = useLang();

  const colorOf = (pid) => {
    const p = room.players.find((x) => x.id === pid);
    return p?.character ? CLASSES[p.character.classId].color : '#a8977a';
  };

  useEffect(() => {
    const s = getSocket();
    const timers = {};
    const on = ({ id, name }) => {
      setTyping((t) => ({ ...t, [id]: name }));
      clearTimeout(timers[id]);
      timers[id] = setTimeout(() => setTyping((t) => {
        const n = { ...t };
        delete n[id];
        return n;
      }), 3000);
    };
    const onMsg = (m) => setTyping((t) => {
      if (!t[m.pid]) return t;
      const n = { ...t };
      delete n[m.pid];
      return n;
    });
    s.on('chat:typing', on);
    s.on('chat:msg', onMsg);
    return () => {
      s.off('chat:typing', on);
      s.off('chat:msg', onMsg);
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [room.chat.length]);

  const send = async (msg, quick = false) => {
    const t = (msg ?? text).trim();
    if (!t) return;
    setError('');
    const res = await emit('chat:send', { text: t, quick });
    if (!res.ok) setError(res.error);
    else if (msg == null) setText('');
  };

  const onType = (v) => {
    setText(v);
    const now = Date.now();
    if (now - lastTyping.current > 2000) {
      lastTyping.current = now;
      getSocket().emit('chat:typing');
    }
  };

  // pesan cepat yang sesuai situasi
  const quick = useMemo(() => {
    const foes = room.enemies?.filter((e) => e.hp > 0) || [];
    const weakest = [...foes].sort((a, b) => a.hp - b.hp)[0];
    const hurt = room.players.filter((p) => p.character && p.character.hp > 0 && p.character.hp <= p.character.maxHp / 2);
    const q = [];
    if (weakest) q.push(T('chatq.focus', { name: weakest.name }));
    if (hurt.length) q.push(T('chatq.heal', { name: hurt[0].character.name }));
    if (foes.length) q.push(T('chatq.tank'), T('chatq.wait'));
    else q.push(T('chatq.explore'), T('chatq.map'));
    q.push(T('chatq.ready'), T('chatq.agree'));
    return q.slice(0, 5);
  }, [room.enemies, room.players, lang]);

  const plans = Object.entries(room.plans || {});
  const typers = Object.entries(typing).filter(([id]) => id !== me.id).map(([, n]) => n);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="flex items-center gap-2 pb-2">
        <MessagesSquare size={15} className="text-gold" />
        <h2 className="font-display text-sm font-bold tracking-[0.25em] text-parch-dim uppercase">{T('chat.title')}</h2>
        <span className="ml-auto text-[10px] text-parch-dim/70">{T('chat.private')}</span>
      </div>

      {plans.length > 0 && (
        <div className="mb-2 rounded-lg border border-gold/15 bg-ink/50 p-2">
          <p className="text-[10px] font-semibold tracking-widest text-parch-dim uppercase">{T('chat.plans')}</p>
          <ul className="mt-1 space-y-0.5">
            {plans.map(([pid, pl]) => {
              const p = room.players.find((x) => x.id === pid);
              const tgt = room.enemies.find((e) => e.id === pl.target)?.name || room.players.find((x) => x.id === pl.target)?.character?.name;
              const done = room.submitted.includes(pid);
              return (
                <li key={pid} className="flex items-center gap-1 text-xs">
                  <span className="font-semibold" style={{ color: colorOf(pid) }}>
                    {p?.character?.name || p?.name}
                  </span>
                  <span className="text-parch-dim">→ {(() => { const pp = room.players.find((x) => x.id === pid)?.character; const sk = pp && skillsFor(pp).find((x) => x.id === pl.skill); return sk ? D.skillName(sk) : pl.name; })()}</span>
                  {tgt && (
                    <span className="flex items-center gap-0.5 text-gold">
                      <Target size={10} />
                      {tgt}
                    </span>
                  )}
                  {done && <span className="ml-auto text-[10px] text-moss">{T('chat.sent')}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div ref={list} className="scroll-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {room.chat.length === 0 && <p className="py-6 text-center text-xs text-parch-dim">{T('chat.empty')}</p>}
        <AnimatePresence initial={false}>
          {room.chat.map((m) => {
            const mine = m.pid === me.id;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-xl px-2.5 py-1.5 text-sm ${mine ? 'rounded-br-sm bg-ember/15' : 'rounded-bl-sm bg-ink/70'} ${m.quick ? 'border border-gold/25' : ''}`}>
                  {!mine && (
                    <p className="text-[10px] font-bold" style={{ color: colorOf(m.pid) }}>
                      {m.author}
                    </p>
                  )}
                  {m.roll ? (
                    <p className="text-parch-dim">
                      <Dices size={12} className="mr-1 inline text-ember" />
                      {m.roll.expr}: [{m.roll.dice.join(', ')}]{m.roll.bonus ? ` ${fmtMod(m.roll.bonus)}` : ''} = <b className="text-parch">{m.roll.total}</b>
                    </p>
                  ) : (
                    <p className="break-words text-parch/95">{m.text}</p>
                  )}
                  <p className="text-right text-[9px] text-parch-dim/60">{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <p className="h-4 text-[11px] text-parch-dim italic">{typers.length ? T('chat.typing', { names: typers.join(', ') }) : ''}</p>

      <div className="scroll-thin flex gap-1 overflow-x-auto pb-1.5">
        {quick.map((q) => (
          <button key={q} onClick={() => send(q, true)} className="shrink-0 rounded-full border border-gold/15 bg-ink/60 px-2.5 py-0.5 text-[11px] text-parch-dim hover:border-ember/50 hover:text-parch">
            {q}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          maxLength={300}
          placeholder={T('chat.ph')}
          className="min-w-0 flex-1 rounded-lg border border-gold/20 bg-ink/80 px-3 py-2 text-sm outline-none focus:border-ember/60"
        />
        <button onClick={() => send()} className="rounded-lg bg-ember/90 px-3 text-ink hover:bg-ember" aria-label={T('chat.send')}>
          <Send size={16} />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-blood">{error}</p>}
    </div>
  );
}

'use client';
import { useState } from 'react';
import { BookMarked, ChevronDown, ChevronUp, Flag, History, UserRound } from 'lucide-react';
import { useLang } from '@/lib/lang';

const ATT = { friendly: 'text-moss', neutral: 'text-parch-dim', hostile: 'text-blood', dead: 'text-parch-dim line-through' };

function repLabel(v, T) {
  if (v >= 60) return T('world.rep.ally');
  if (v >= 20) return T('world.rep.friendly');
  if (v > -20) return T('world.rep.neutral');
  if (v > -60) return T('world.rep.wary');
  return T('world.rep.enemy');
}

/** Dunia yang bereaksi: reputasi faksi, jurnal misi cerita, NPC yang dikenal, dan kronik konsekuensi. */
export default function WorldPanel({ room }) {
  const { T } = useLang();
  const W = room.world || {};
  const [open, setOpen] = useState(true);
  const factions = Object.entries(W.factions || {});
  const journal = (W.journal || []).slice().reverse();
  const npcs = (W.npcs || []).slice().reverse();
  const chronicle = (W.chronicle || []).slice(-6).reverse();
  if (!factions.length && !journal.length && !npcs.length && !chronicle.length) return null;
  const H = ({ icon: I, children }) => (
    <h3 className="mt-3 mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-parch-dim uppercase">
      <I size={12} /> {children}
    </h3>
  );
  return (
    <div className="pt-1">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 font-display text-sm font-bold tracking-[0.25em] text-parch-dim uppercase">
        {T('world.title')} {open ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
      </button>
      {open && (
        <div className="text-xs">
          {factions.length > 0 && (
            <>
              <H icon={Flag}>{T('world.factions')}</H>
              <div className="space-y-1.5">
                {factions.map(([name, v]) => (
                  <div key={name}>
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{name}</span>
                      <span className={v > 0 ? 'text-moss' : v < 0 ? 'text-blood' : 'text-parch-dim'}>
                        {repLabel(v, T)} {v > 0 ? '+' : ''}
                        {v}
                      </span>
                    </div>
                    {/* bar dua arah: tengah = netral */}
                    <div className="relative mt-0.5 h-1 rounded-full bg-black/60">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-gold/30" />
                      <div
                        className={`absolute inset-y-0 rounded-full ${v >= 0 ? 'left-1/2 bg-moss' : 'right-1/2 bg-blood'}`}
                        style={{ width: `${Math.abs(v) / 2}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {journal.length > 0 && (
            <>
              <H icon={BookMarked}>{T('world.journal')}</H>
              <ul className="space-y-1">
                {journal.map((q) => (
                  <li key={q.title} className={`rounded-md border px-2 py-1 ${q.status === 'active' ? 'border-ember/30' : 'border-gold/10 opacity-60'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-semibold ${q.status === 'failed' ? 'line-through' : ''}`}>{q.title}</span>
                      <span className="shrink-0 text-[10px] text-parch-dim">
                        {T(`world.qt.${q.type}`)} · {T(`world.q.${q.status}`)}
                      </span>
                    </div>
                    {q.desc && q.status === 'active' && <p className="mt-0.5 text-[11px] text-parch-dim">{q.desc}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {npcs.length > 0 && (
            <>
              <H icon={UserRound}>{T('world.npcs')}</H>
              <ul className="space-y-0.5">
                {npcs.map((n) => (
                  <li key={n.name} title={n.note}>
                    <span className={`font-semibold ${ATT[n.attitude] || ''}`}>{n.name}</span> <span className="text-parch-dim">· {n.role || '?'} · {T(`world.att.${n.attitude}`)}</span>
                    {n.note && <p className="text-[11px] text-parch-dim/80">{n.note}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {chronicle.length > 0 && (
            <>
              <H icon={History}>{T('world.chronicle')}</H>
              <ul className="space-y-1 border-l border-gold/20 pl-2">
                {chronicle.map((c, i) => (
                  <li key={i} className="text-parch/90">
                    <span className="text-[10px] text-parch-dim">R{c.round} · </span>
                    {c.text}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

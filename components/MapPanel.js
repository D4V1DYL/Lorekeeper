'use client';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Castle, Crown, Footprints, Gem, MapPin, MountainSnow, Skull, Sprout, Swords, Trees, Waves, X } from 'lucide-react';
import { AREAS, AREA_BY_ID, CLASSES } from '@/lib/data';
import { emit } from '@/lib/client';
import { useLang } from '@/lib/lang';

const ICON = { forest: Trees, cave: Gem, coast: Waves, snow: MountainSnow, swamp: Sprout, castle: Castle };
const TINT = { forest: '#74b06d', cave: '#8b7cf6', coast: '#4aa8d8', snow: '#c8d6f0', swamp: '#9bb54a', castle: '#d0473f' };

/** Peta dunia: pilih area lewat voting, host bisa langsung memberangkatkan party atau menantang bos. */
export default function MapPanel({ room, me, isHost, onClose }) {
  const [sel, setSel] = useState(room.area || AREAS[0].id);
  const [error, setError] = useState('');
  const { T, D } = useLang();
  const A = AREA_BY_ID[sel];
  const st = room.areaState?.[sel] || {};
  const here = room.area === sel;
  const fighting = room.inCombat && room.enemies.length > 0;
  const canMove = room.phase === 'action' && !fighting;
  const avgLv = Math.round(room.players.filter((p) => p.character).reduce((a, p) => a + (p.character.level || 1), 0) / Math.max(1, room.players.filter((p) => p.character).length));
  const voters = (id) => Object.entries(room.votes || {}).filter(([, a]) => a === id).map(([pid]) => room.players.find((p) => p.id === pid)).filter(Boolean);
  const call = async (ev, payload) => {
    setError('');
    const res = await emit(ev, payload);
    if (!res.ok) setError(res.error);
    else if (ev !== 'map:vote') onClose();
  };
  const bossReady = here && !st.bossDefeated && (st.cleared || 0) >= A.bossAfter;

  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ y: 20, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        className="panel max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="gold-text font-display text-2xl font-black">{T('map.title')}</h2>
          <button onClick={onClose} className="text-parch-dim hover:text-parch" aria-label={T('common.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          {/* peta */}
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-xl border border-gold/25"
            style={{ background: 'radial-gradient(ellipse at 30% 40%, #3a3020, #221a12 70%), #1c150e' }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
              {AREAS.flatMap((a) =>
                a.links.filter((l) => l > a.id).map((l) => {
                  const b = AREA_BY_ID[l];
                  return <line key={a.id + l} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#d9a94e" strokeOpacity="0.35" strokeWidth="0.6" strokeDasharray="1.6 1.4" vectorEffect="non-scaling-stroke" />;
                }),
              )}
            </svg>
            <p className="absolute top-2 left-3 font-display text-[10px] tracking-[0.3em] text-gold/50 uppercase">{T('map.world')}</p>
            {AREAS.map((a) => {
              const Icon = ICON[a.biome] || MapPin;
              const s = room.areaState?.[a.id] || {};
              const v = voters(a.id);
              const isHere = room.area === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSel(a.id)}
                  className="group absolute -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: `${a.x}%`, top: `${a.y}%` }}
                >
                  <span
                    className={`relative mx-auto grid h-11 w-11 place-items-center rounded-full border-2 transition group-hover:scale-110 ${sel === a.id ? 'scale-110' : ''}`}
                    style={{ borderColor: sel === a.id ? '#f6dfa4' : `${TINT[a.biome]}aa`, background: `radial-gradient(circle at 35% 30%, ${TINT[a.biome]}55, #15110e 75%)`, boxShadow: isHere ? `0 0 22px ${TINT[a.biome]}` : 'none' }}
                  >
                    <Icon size={20} style={{ color: TINT[a.biome] }} />
                    {s.bossDefeated && <Crown size={14} className="absolute -top-2 -right-1 text-gold" />}
                    {isHere && <MapPin size={16} className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce text-ember" />}
                  </span>
                  <span className="mt-1 block max-w-[92px] text-[10px] leading-tight font-semibold text-parch/90 [text-shadow:0_1px_2px_#000]">{D.areaName(a.id, a.name)}</span>
                  <span className="block text-[9px] text-parch-dim">Lv {a.level.join('–')}</span>
                  {v.length > 0 && (
                    <span className="mt-0.5 flex justify-center gap-0.5">
                      {v.map((p) => (
                        <span key={p.id} className="h-2 w-2 rounded-full" title={p.character?.name} style={{ background: p.character ? CLASSES[p.character.classId].color : '#aaa' }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* detail area */}
          <div>
            <p className="font-display text-xl font-bold" style={{ color: TINT[A.biome] }}>
              {D.areaName(A.id, A.name)}
            </p>
            <p className="text-xs text-parch-dim">
              {T('map.level', { lv: A.level.join('–'), avg: avgLv })}
              {avgLv < A.level[0] && <span className="ml-1 text-blood">{T('map.danger')}</span>}
            </p>
            <p className="mt-2 font-story text-lg leading-snug text-parch/90">{D.areaDesc(A.id, A.desc)}</p>

            <div className="mt-3 rounded-lg border border-gold/10 bg-ink/50 p-3 text-sm">
              <p className="flex items-center gap-1.5">
                <Swords size={14} className="text-gold" /> {T('map.won')} <b>{Math.min(st.cleared || 0, A.bossAfter)}</b>/{A.bossAfter}
              </p>
              <p className="mt-1 flex items-center gap-1.5">
                <Skull size={14} className={st.bossDefeated ? 'text-gold' : 'text-blood'} /> {T('map.boss')} {D.bossName(A.id, A.boss.name)}{' '}
                <span className="text-parch-dim">({st.bossDefeated ? T('map.bossDone') : (st.cleared || 0) >= A.bossAfter ? T('map.bossReady') : T('map.bossHidden')})</span>
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {here ? (
                <>
                  <p className="flex items-center gap-1.5 text-sm text-ember">
                    <MapPin size={14} /> {T('map.here')}
                  </p>
                  {bossReady &&
                    (isHost ? (
                      <button onClick={() => call('boss:challenge')} disabled={!canMove} className="w-full rounded-lg bg-gradient-to-b from-blood to-[#8a2020] py-2.5 font-display font-bold text-white disabled:opacity-50">
                        <Skull size={16} className="mr-1.5 inline" /> {T('map.challenge', { name: D.bossName(A.id, A.boss.name) })}
                      </button>
                    ) : (
                      <p className="text-xs text-parch-dim">{T('map.bossReadyGuest')}</p>
                    ))}
                </>
              ) : (
                <>
                  <button
                    onClick={() => call('map:vote', { area: sel })}
                    disabled={!canMove}
                    className={`w-full rounded-lg border py-2.5 font-display font-bold disabled:opacity-50 ${room.votes?.[me.id] === sel ? 'border-moss bg-moss/15 text-moss' : 'border-gold/40 text-gold hover:bg-gold/10'}`}
                  >
                    <Footprints size={16} className="mr-1.5 inline" />
                    {room.votes?.[me.id] === sel ? T('map.unvote') : T('map.vote')}
                  </button>
                  {isHost && (
                    <button onClick={() => call('map:travel', { area: sel })} disabled={!canMove} className="w-full rounded-lg bg-gradient-to-b from-ember to-[#c4621f] py-2.5 font-display font-bold text-ink disabled:opacity-50">
                      {T('map.go')}
                    </button>
                  )}
                  <p className="text-[11px] text-parch-dim">{T('map.auto')}</p>
                </>
              )}
              {!canMove && <p className="text-xs text-blood">{fighting ? T('map.fightFirst') : T('map.waitPhase')}</p>}
              {error && <p className="text-xs text-blood">{error}</p>}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

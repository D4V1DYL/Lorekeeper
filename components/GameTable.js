'use client';
import { AnimatePresence, motion } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, Download, HeartPulse, Menu, Music, Printer, ScrollText, Store, Volume2, Backpack, Check, ChevronDown, ChevronUp, Coins, Crown, Dices, EyeOff, FastForward, Feather, FlaskConical, Gauge, Map as MapIcon, MessageCircle, MessagesSquare, RotateCcw, Send, Shield, ShieldPlus, Skull, Star, Swords, Target, Timer, Users, WifiOff, X } from 'lucide-react';
import StoryLog from './StoryLog';
import ChatPanel from './ChatPanel';
import MapPanel from './MapPanel';
import LangToggle from './LangToggle';
import ShopPanel from './ShopPanel';
import HostControls from './HostControls';
import Tutorial, { tutorialSeen } from './Tutorial';
import { downloadStory, printStory } from '@/lib/exportStory';
import { getSoundPrefs, onSoundPrefs, setSoundPrefs } from '@/lib/sound';
import { useLang } from '@/lib/lang';
import D20 from './D20';
import { Sigil } from './ClassIcon';
import { CLASSES, ENEMY_TYPES, ITEMS, LEVEL_XP, MAX_LEVEL, QUESTS, RACES, STATS, effectiveAC, fmtMod, skillSummary, skillsFor, totalMod } from '@/lib/data';
import { emit, getLowPower, getSocket, setLowPower } from '@/lib/client';
import { AREA_BY_ID } from '@/lib/data';

const StageView = dynamic(() => import('./StageView'), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-coal" /> });

export default function GameTable({ room, me, isHost }) {
  const [showParty, setShowParty] = useState(false);
  const [showStage, setShowStage] = useState(true);
  const [skillId, setSkillId] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [lowPower, setLow] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showTut, setShowTut] = useState(false);
  const [menu, setMenu] = useState(false);
  const { T, D, lang } = useLang();
  useEffect(() => {
    if (!tutorialSeen()) setShowTut(true);
  }, []);
  const [drawerTab, setDrawerTab] = useState('party');
  const [seen, setSeen] = useState(room.chat.length);
  const chatVisible = showParty && drawerTab === 'chat';
  useEffect(() => {
    if (chatVisible) setSeen(room.chat.length);
  }, [chatVisible, room.chat.length]);
  const unread = Math.max(0, room.chat.length - seen);
  const area = AREA_BY_ID[room.area];
  const ast = room.areaState?.[room.area] || {};
  useEffect(() => setLow(getLowPower()), []);
  const toggleLow = () => {
    setLowPower(!lowPower);
    setLow(!lowPower);
  };

  const mySkills = me.character ? skillsFor(me.character) : [];
  const skill = mySkills.find((s) => s.id === skillId) || null;
  const aliveEnemies = room.enemies.filter((e) => e.hp > 0);

  // target default: musuh pertama untuk skill ofensif, diri sendiri untuk skill sekutu
  useEffect(() => {
    if (!skill) return;
    if (skill.ally) {
      if (!room.players.some((p) => p.id === targetId && p.character)) setTargetId(me.id);
    } else if (!aliveEnemies.some((e) => e.id === targetId)) setTargetId(aliveEnemies[0]?.id || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId, room.enemies]);

  const onPick = (id, side) => {
    if (room.phase !== 'action') return;
    if (side === 'enemy') {
      if (!skill || skill.ally) setSkillId('basic');
      setTargetId(id);
    } else if (skill?.ally) setTargetId(id);
  };
  const pick = { mySkills, skill, setSkillId, targetId, setTargetId, aliveEnemies };

  // bagikan rencana (skill + target) ke tim selagi memilih, sebelum aksi dikirim
  useEffect(() => {
    if (room.phase !== 'action' || room.submitted.includes(me.id)) return;
    const t = setTimeout(() => getSocket().emit('plan:set', { skill: skillId, target: targetId }, () => {}), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId, targetId, room.phase]);
  return (
    <div className="flex h-dvh flex-col">
      <header className="relative z-30 flex items-center gap-2 border-b border-gold/10 bg-ink/70 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-5">
        <Link href="/" className="shrink-0" title={T('game.home')}>
          <D20 value={20} size={34} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-gold sm:text-lg">{room.scene || T('game.started')}</p>
          <p className="truncate text-[11px] text-parch-dim">
            {area && (
              <>
                <b className="text-parch">{D.areaName(area.id, area.name)}</b> · {ast.bossDefeated ? T('game.conquered') : T('game.toBoss', { n: Math.min(ast.cleared || 0, area.bossAfter), m: area.bossAfter })} ·{' '}
              </>
            )}
            Room <b className="tracking-widest text-parch">{room.code}</b> · {T('game.round', { n: room.round })} · DM: {room.dm.mock ? T('game.dmDemo') : room.dm.model.split('/').pop()}
          </p>
        </div>
        <button onClick={() => setShowShop(true)} className="flex items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1.5 text-sm text-gold" title={T('shop.title')}>
          <Store size={15} /> <span className="hidden sm:inline">{T('game.shop')}</span>
        </button>
        <button onClick={() => setShowMap(true)} className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm text-gold" title={T('map.title')}>
          <MapIcon size={15} /> <span className="hidden sm:inline">{T('game.map')}</span>
          {Object.keys(room.votes || {}).length > 0 && <span className="rounded-full bg-ember px-1.5 text-[10px] font-bold text-ink">{Object.keys(room.votes).length}</span>}
        </button>
        <button onClick={() => setShowStage((v) => !v)} className="hidden items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1.5 text-sm text-gold sm:flex" title={T('game.stageTip')}>
          <Swords size={15} /> <span className="hidden md:inline">{T('game.stage')}</span> {showStage ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <MoreMenu
          open={menu}
          setOpen={setMenu}
          room={room}
          lang={lang}
          lowPower={lowPower}
          toggleLow={toggleLow}
          showStage={showStage}
          toggleStage={() => setShowStage((v) => !v)}
          openTutorial={() => setShowTut(true)}
        />
        <button
          onClick={() => {
            setDrawerTab('chat');
            setShowParty(true);
          }}
          className="relative flex items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1.5 text-sm text-gold lg:hidden"
        >
          <MessagesSquare size={15} />
          {unread > 0 && <span className="absolute -top-1.5 -right-1.5 rounded-full bg-ember px-1.5 text-[10px] font-bold text-ink">{unread}</span>}
        </button>
        <button
          onClick={() => {
            setDrawerTab('party');
            setShowParty((v) => !v);
          }}
          className="flex items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1.5 text-sm text-gold lg:hidden"
        >
          <Users size={15} />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className={`shrink-0 border-b border-gold/10 bg-black/40 ${showStage ? '' : 'hidden'}`}>
            <div className="mx-auto aspect-video max-h-[34vh] w-full max-w-[calc(34vh*16/9)] lg:max-h-[38vh] lg:max-w-[calc(38vh*16/9)]">
              <StageView room={room} targetId={room.phase === 'action' ? targetId : null} onPick={onPick} lowPower={lowPower} />
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <StoryLog log={room.log} players={room.players} />
          </div>
          <ActionBar room={room} me={me} isHost={isHost} pick={pick} />
        </section>

        <aside className="hidden w-80 shrink-0 flex-col border-l border-gold/10 bg-coal/60 lg:flex">
          <div className="scroll-thin max-h-[52%] min-h-0 overflow-y-auto p-4">
            <PartyPanel room={room} me={me} />
          </div>
          <ChatPanel room={room} me={me} className="flex-1 border-t border-gold/10 p-4" />
        </aside>

        <AnimatePresence>
          {showParty && (
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="scroll-thin absolute inset-y-0 right-0 z-30 w-[88%] max-w-sm overflow-y-auto border-l border-gold/15 bg-coal p-4 shadow-2xl lg:hidden"
            >
              <div className="mb-3 flex items-center gap-2">
                {[
                  ['party', T('game.party')],
                  ['chat', T('game.teamChat')],
                ].map(([id, l]) => (
                  <button key={id} onClick={() => setDrawerTab(id)} className={`rounded-full px-3 py-1 text-sm ${drawerTab === id ? 'bg-ember/20 text-ember' : 'text-parch-dim'}`}>
                    {l}
                  </button>
                ))}
                <button onClick={() => setShowParty(false)} className="ml-auto flex items-center gap-1 text-sm text-parch-dim">
                  <X size={16} /> {T('common.close')}
                </button>
              </div>
              {drawerTab === 'party' ? <PartyPanel room={room} me={me} /> : <ChatPanel room={room} me={me} className="h-[calc(100dvh-7rem)]" />}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>{showMap && <MapPanel room={room} me={me} isHost={isHost} onClose={() => setShowMap(false)} />}</AnimatePresence>
      <AnimatePresence>{showShop && <ShopPanel room={room} me={me} onClose={() => setShowShop(false)} />}</AnimatePresence>
      <Tutorial open={showTut} onClose={() => setShowTut(false)} />
    </div>
  );
}

function PartyPanel({ room, me }) {
  const [open, setOpen] = useState(null);
  const submitted = new Set(room.submitted);
  const { T: tr, D } = useLang();
  return (
    <div className="space-y-3">
      <h2 className="font-display text-sm font-bold tracking-[0.25em] text-parch-dim uppercase">{tr('party.title')}</h2>
      {room.players.map((p) => {
        const c = p.character;
        if (!c)
          return (
            <div key={p.id} className="rounded-xl border border-dashed border-gold/20 p-3 text-sm text-parch-dim">
              {tr('party.making', { name: p.name })}
            </div>
          );
        const pct = c.hp / c.maxHp;
        const down = c.hp <= 0;
        const ds = c.death || {};
        const roll = room.pendingRolls.find((r) => r.playerId === p.id && !r.result);
        return (
          <motion.div layout key={p.id} className={`rounded-xl border bg-ink/50 p-3 ${p.id === me.id ? 'border-ember/40' : 'border-gold/10'} ${down ? 'opacity-60' : ''}`}>
            <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(open === p.id ? null : p.id)}>
              <Sigil character={c} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-display font-bold">
                  {c.name}
                  {room.hostId === p.id && <Crown size={12} className="text-gold" />}
                  {!p.connected && <WifiOff size={12} className="text-parch-dim" />}
                </p>
                <p className="truncate text-[11px] text-parch-dim">
                  Lv {c.level} · {D.race(c.raceId, RACES[c.raceId].label)} {CLASSES[c.classId].label}
                </p>
              </div>
              <HostControls room={room} me={me} player={p} />
              <div className="flex items-center gap-1 text-sm text-gold" title="Armor Class">
                <Shield size={14} /> {effectiveAC(c)}
              </div>
            </button>

            <div className="mt-2.5">
              <div className="h-2 overflow-hidden rounded-full bg-black/60">
                <motion.div
                  className="h-full origin-left rounded-full"
                  style={{ background: pct > 0.5 ? '#7cbf73' : pct > 0.25 ? '#d9a94e' : '#d0473f' }}
                  initial={false}
                  animate={{ scaleX: Math.max(0, pct) }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
              <XpBar c={c} />
              <div className="mt-1 flex justify-between text-[11px]">
                <span className="text-parch-dim">
                  {down ? (
                    <span className={ds.dead ? 'text-blood' : ds.stable ? 'text-gold' : 'glow-pulse text-blood'}>
                      {ds.dead ? <Skull size={11} className="mr-0.5 inline" /> : <HeartPulse size={11} className="mr-0.5 inline" />}
                      {ds.dead ? tr('party.dead') : ds.stable ? tr('party.stable') : tr('party.dying', { s: ds.s || 0, f: ds.f || 0 })}
                    </span>
                  ) : (
                    `${c.hp}/${c.maxHp} HP`
                  )}
                </span>
                <span>
                  {room.phase === 'action' && !down && (submitted.has(p.id) ? <span className="text-moss">{tr('party.ready')}</span> : <span className="text-parch-dim">{tr('party.thinking')}</span>)}
                  {roll && <span className="glow-pulse text-ember">{tr('party.mustRoll', { stat: roll.stat })}</span>}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="flex items-center gap-0.5 text-gold">
                  <Coins size={11} /> {c.gold ?? 0}
                </span>
                {c.status?.shield > 0 && (
                  <span className="flex items-center gap-0.5 rounded-full bg-gold/10 px-1.5 text-gold">
                    <ShieldPlus size={10} /> {tr('party.shield', { n: c.status.shield })}
                  </span>
                )}
                {c.status?.hidden > 0 && (
                  <span className="flex items-center gap-0.5 rounded-full bg-arcane/15 px-1.5 text-arcane">
                    <EyeOff size={10} /> {tr('party.hidden')}
                  </span>
                )}
                {Object.entries(c.cooldowns || {}).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-0.5 rounded-full bg-black/40 px-1.5 text-parch-dim">
                    <Timer size={10} /> {(() => { const sk = skillsFor(c).find((x) => x.id === k); return sk ? D.skillName(sk) : k; })()} {v}
                  </span>
                ))}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {open === p.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-3 grid grid-cols-6 gap-1">
                    {STATS.map((s) => (
                      <div key={s} className="rounded bg-black/40 py-1 text-center">
                        <p className="text-[9px] text-parch-dim">{s}</p>
                        <p className="font-display text-sm font-bold">{fmtMod(totalMod(c, s))}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-parch/80">
                    <Backpack size={13} className="mt-0.5 shrink-0 text-gold" />{' '}
                    {[...(c.inv || []).filter((x) => x.qty > 0).map((x) => `${D.itemName(x.id, ITEMS[x.id]?.name || x.id)}${x.qty > 1 ? ` ×${x.qty}` : ''}`), ...c.items.map((i) => D.item(i))].join(' · ') || tr('party.empty')}
                  </p>
                  <p className="mt-1.5 text-[11px] text-parch-dim">{D.classFeature(c.classId, CLASSES[c.classId].feature)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
      {room.enemies.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-[0.25em] text-parch-dim uppercase">
            {tr('party.enemies')} {room.inCombat && <span className="glow-pulse rounded-full bg-blood/20 px-2 py-px font-sans text-[9px] tracking-normal text-blood normal-case">{tr('party.fighting')}</span>}
          </h2>
          {room.enemies.map((e) => {
            const T = ENEMY_TYPES[e.type] || {};
            const k = e.hp / Math.max(1, e.maxHp);
            return (
              <div key={e.id} className="rounded-lg border border-blood/20 bg-ink/50 px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-semibold">
                    {T.boss && <Star size={11} className="mr-1 inline text-gold" />}
                    {e.name}
                  </span>
                  <span className="shrink-0 text-parch-dim">
                    AC {T.ac} · {e.hp}/{e.maxHp}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/60">
                  <div className="h-full origin-left rounded-full bg-blood transition-transform duration-500" style={{ transform: `scaleX(${Math.max(0, k)})` }} />
                </div>
                {Object.keys(e.status || {}).length > 0 && (
                  <p className="mt-1 text-[10px] text-arcane">{Object.keys(e.status).map((x) => (x === 'stun' || x === 'weak' ? tr(`status.${x}`) : x)).join(' · ')}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <QuestList room={room} />
      {room.summary && (
        <div className="rounded-xl border border-gold/10 bg-ink/40 p-3">
          <p className="text-[10px] font-semibold tracking-widest text-parch-dim uppercase">{tr('party.story')}</p>
          <p className="mt-1 font-story text-base leading-snug text-parch/85">{room.summary}</p>
        </div>
      )}
    </div>
  );
}

function QuestList({ room }) {
  const { T, D } = useLang();
  const visited = new Set(Object.entries(room.areaState || {}).filter(([, s]) => s.visited).map(([id]) => id));
  const list = QUESTS.filter((q) => visited.has(q.area) || q.area === room.area);
  if (!list.length) return null;
  return (
    <div className="space-y-1.5 pt-1">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold tracking-[0.25em] text-parch-dim uppercase">
        <ScrollText size={14} /> {T('quest.title')}
      </h2>
      {list.map((q) => {
        const st = room.quests?.[q.id] || { n: 0 };
        const here = q.area === room.area;
        const item = q.reward.item ? D.itemName(q.reward.item, ITEMS[q.reward.item]?.name) : '';
        return (
          <div key={q.id} className={`rounded-lg border px-3 py-2 ${st.done ? 'border-moss/30 bg-moss/5' : here ? 'border-ember/30 bg-ink/50' : 'border-gold/10 bg-ink/30 opacity-70'}`}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-semibold">{D.questTitle(q.id, q.title)}</span>
              <span className={`shrink-0 ${st.done ? 'text-moss' : 'text-parch-dim'}`}>{st.done ? `✓ ${T('quest.done')}` : `${Math.min(st.n, q.count)}/${q.count}`}</span>
            </div>
            {!st.done && (
              <>
                <p className="mt-0.5 text-[11px] text-parch-dim">{D.questDesc(q.id, q.desc)}</p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/60">
                  <div className="h-full origin-left rounded-full bg-ember transition-transform duration-500" style={{ transform: `scaleX(${Math.min(1, st.n / q.count)})` }} />
                </div>
                <p className="mt-1 text-[10px] text-gold/80">{T('quest.reward', { xp: q.reward.xp, gold: q.reward.gold, item })}</p>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MoreMenu({ open, setOpen, room, lang, lowPower, toggleLow, showStage, toggleStage, openTutorial }) {
  const { T } = useLang();
  const [snd, setSnd] = useState({ sfx: 0.7, music: 0.35 });
  useEffect(() => {
    setSnd(getSoundPrefs());
    return onSoundPrefs(setSnd);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, setOpen]);
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-parch hover:bg-gold/10';
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1.5 text-sm text-gold" title={T('menu.more')}>
        <Menu size={15} /> <span className="hidden xl:inline">{T('menu.more')}</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gold/20 bg-coal p-2 shadow-2xl"
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-parch-dim">{T('menu.lang')}</span>
                <LangToggle />
              </div>
              <label className="flex items-center gap-2.5 px-3 py-1.5 text-sm">
                <Music size={15} className="shrink-0 text-gold" />
                <span className="w-14 shrink-0 text-parch-dim">{T('menu.music')}</span>
                <input type="range" min={0} max={1} step={0.05} value={snd.music} onChange={(e) => setSoundPrefs({ music: +e.target.value })} className="w-full accent-[#f08a3c]" />
              </label>
              <label className="flex items-center gap-2.5 px-3 py-1.5 text-sm">
                <Volume2 size={15} className="shrink-0 text-gold" />
                <span className="w-14 shrink-0 text-parch-dim">{T('menu.sfx')}</span>
                <input type="range" min={0} max={1} step={0.05} value={snd.sfx} onChange={(e) => setSoundPrefs({ sfx: +e.target.value })} className="w-full accent-[#f08a3c]" />
              </label>
              <div className="my-1 border-t border-gold/10" />
              <button className={item} onClick={toggleLow} title={T('game.saverTip')}>
                <Gauge size={15} className={lowPower ? 'text-moss' : 'text-gold'} /> {lowPower ? T('game.saver') : T('game.full')}
              </button>
              <button className={`${item} sm:hidden`} onClick={toggleStage}>
                <Swords size={15} className="text-gold" /> {T('game.stage')} {showStage ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button
                className={item}
                onClick={() => {
                  setOpen(false);
                  openTutorial();
                }}
              >
                <BookOpen size={15} className="text-gold" /> {T('menu.tutorial')}
              </button>
              <button
                className={item}
                onClick={() => {
                  setOpen(false);
                  downloadStory(room, lang);
                }}
              >
                <Download size={15} className="text-gold" /> {T('menu.export')}
              </button>
              <button
                className={item}
                onClick={() => {
                  setOpen(false);
                  printStory(room, lang);
                }}
              >
                <Printer size={15} className="text-gold" /> {T('menu.print')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function XpBar({ c }) {
  const lv = c.level || 1;
  const { T } = useLang();
  if (lv >= MAX_LEVEL) return <p className="mt-1 text-[10px] text-gold">{T('party.maxLevel')}</p>;
  const from = LEVEL_XP[lv] || 0, to = LEVEL_XP[lv + 1];
  const k = Math.max(0, Math.min(1, ((c.xp || 0) - from) / Math.max(1, to - from)));
  return (
    <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/60" title={`${c.xp || 0}/${to} XP`}>
      <div className="h-full origin-left rounded-full bg-arcane transition-transform duration-700" style={{ transform: `scaleX(${k})` }} />
    </div>
  );
}

const QUICK = ['quick.1', 'quick.2', 'quick.3', 'quick.4', 'quick.5'];

function ActionBar({ room, me, isHost, pick }) {
  const { T, D, lang } = useLang();
  const [tab, setTab] = useState('action');
  const [text, setText] = useState('');
  const [chat, setChat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const c = me.character;
  const down = c && c.hp <= 0;
  const mySubmitted = room.submitted.includes(me.id);
  const myRoll = room.pendingRolls.find((r) => r.playerId === me.id && !r.result);
  const actors = room.players.filter((p) => p.character && p.character.hp > 0 && p.connected);

  const call = async (event, payload, after) => {
    setError('');
    setBusy(true);
    const res = await emit(event, payload);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else after?.();
  };

  const { mySkills, skill, setSkillId, targetId, setTargetId, aliveEnemies } = pick;
  const sendAction = () =>
    (text.trim() || skill) &&
    call('action:submit', { text, skill: skill?.id, target: targetId }, () => {
      setText('');
      setSkillId(null);
    });
  const sendChat = () => chat.trim() && call('chat:send', { text: chat }, () => setChat(''));

  let body;
  if (tab === 'chat') {
    body = (
      <div className="flex gap-2">
        <input
          value={chat}
          onChange={(e) => setChat(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendChat()}
          maxLength={300}
          placeholder={T('chat.ph')}
          className="flex-1 rounded-lg border border-gold/20 bg-ink/80 px-3 py-2.5 outline-none focus:border-ember/60"
        />
        <button onClick={sendChat} disabled={busy} className="rounded-lg border border-gold/30 px-4 text-gold hover:bg-gold/10">
          <Send size={18} />
        </button>
      </div>
    );
  } else if (room.phase === 'narrating') {
    body = (
      <p className="flex items-center justify-center gap-2 py-3 font-display text-parch-dim">
        <Feather size={18} className="glow-pulse text-ember" /> {T('act.narrating')}
      </p>
    );
  } else if (room.phase === 'stalled') {
    body = (
      <div className="flex flex-col items-center gap-2 py-1 text-center">
        <p className="text-sm text-parch-dim">{T('act.stalled')}</p>
        {isHost ? (
          <button onClick={() => call('dm:retry')} disabled={busy} className="flex items-center gap-2 rounded-lg bg-ember px-5 py-2.5 font-display font-bold text-ink">
            <RotateCcw size={16} /> {T('act.retry')}
          </button>
        ) : (
          <p className="text-xs text-parch-dim">{T('act.waitHostRetry')}</p>
        )}
      </div>
    );
  } else if (room.phase === 'ended') {
    body = (
      <div className="flex flex-col items-center gap-2 py-1 text-center">
        <p className="font-display text-lg text-gold">{T('act.ended')}</p>
        {isHost && (
          <button onClick={() => call('game:continue')} disabled={busy} className="rounded-lg bg-ember px-5 py-2.5 font-display font-bold text-ink">
            {T('act.rest')}
          </button>
        )}
      </div>
    );
  } else if (room.phase === 'rolling') {
    const pending = room.pendingRolls.filter((r) => !r.result);
    body = (
      <div className="flex flex-col items-center gap-3 py-1">
        {myRoll ? (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => call('roll:do', { id: myRoll.id })}
            disabled={busy}
            className="flex items-center gap-3 rounded-2xl border border-ember/60 bg-gradient-to-b from-[#3a2414] to-[#1c120b] px-6 py-3 shadow-[0_0_40px_-10px_rgba(240,138,60,.8)]"
          >
            <D20 size={46} glow />
            <span className="text-left">
              <span className="block font-display text-lg font-bold text-ember">{T('act.roll')}</span>
              <span className="block text-sm text-parch-dim">
                {myRoll.stat} {fmtMod(totalMod(c, myRoll.stat))} · DC {myRoll.dc}
                {myRoll.reason ? ` · ${myRoll.reason}` : ''}
              </span>
            </span>
          </motion.button>
        ) : (
          <p className="flex items-center gap-2 text-parch-dim">
            <Dices size={18} className="text-ember" />
            {pending.length ? T('act.waitRolls', { names: pending.map((r) => r.name).join(', ') }) : T('act.diceStop')}
          </p>
        )}
        {isHost && pending.some((r) => r.playerId !== me.id) && (
          <button onClick={() => call('roll:auto')} className="flex items-center gap-1.5 text-xs text-parch-dim hover:text-parch">
            <FastForward size={13} /> {T('act.autoRoll')}
          </button>
        )}
      </div>
    );
  } else if (!c || down) {
    body = <p className="py-3 text-center text-parch-dim">{down ? T('act.downMsg') : T('act.notReady')}</p>;
  } else if (mySubmitted) {
    const waiting = actors.filter((p) => !room.submitted.includes(p.id));
    body = (
      <div className="flex flex-col items-center gap-2 py-1 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="flex items-center gap-2 text-moss">
          <Check size={18} /> {T('act.locked')}
          <span className="text-parch-dim">{waiting.length ? T('act.waitingFor', { names: waiting.map((p) => p.character.name).join(', ') }) : T('act.allReady')}</span>
        </p>
        <div className="flex items-center gap-3">
          <button onClick={() => call('action:cancel')} className="text-sm text-parch-dim hover:text-parch">
            {T('act.change')}
          </button>
          {isHost && (
            <button onClick={() => call('action:force')} className="flex items-center gap-1.5 rounded-lg border border-gold/30 px-3 py-1.5 text-sm text-gold hover:bg-gold/10">
              <FastForward size={14} /> {T('act.continue')}
            </button>
          )}
        </div>
      </div>
    );
  } else {
    const targets = skill?.ally ? room.players.filter((p) => p.character).map((p) => ({ id: p.id, name: p.character.name })) : aliveEnemies.map((e) => ({ id: e.id, name: e.name, type: e.type }));
    body = (
      <div>
        <div className="scroll-thin mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {mySkills.map((s) => {
            const cd = c.cooldowns?.[s.id] || 0;
            const active = skill?.id === s.id;
            const Icon = s.id === 'potion' ? FlaskConical : Swords;
            return (
              <button
                key={s.id}
                disabled={cd > 0}
                onClick={() => setSkillId(active ? null : s.id)}
                title={`${D.skillDesc(s)}${s.cd ? T('act.cooldownTip', { n: s.cd }) : ''}`}
                className={`flex shrink-0 flex-col items-start rounded-lg border px-2.5 py-1.5 text-left text-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${active ? 'border-ember bg-ember/15 text-parch shadow-[0_0_20px_-6px_rgba(240,138,60,.9)]' : 'border-gold/20 bg-ink/60 text-parch-dim enabled:hover:border-gold/40 enabled:hover:text-parch'}`}
              >
                <span className="flex items-center gap-1.5">
                  <Icon size={12} className={active ? 'text-ember' : 'text-gold/70'} />
                  <span className="font-semibold">{D.skillName(s)}</span>
                  {cd > 0 ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-parch-dim">
                      <Timer size={10} />
                      {cd}
                    </span>
                  ) : (
                    !s.noMod && <span className="text-[10px] opacity-70">{fmtMod(totalMod(c, s.stat))}</span>
                  )}
                </span>
                <span className="text-[10px] opacity-60">{skillSummary(s, c, lang)}</span>
              </button>
            );
          })}
        </div>
        {skill && skill.mode !== 'self' && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="flex items-center gap-1 text-parch-dim">
              <Target size={12} /> {T('act.target')}
            </span>
            {targets.length === 0 && <span className="text-parch-dim italic">{T('act.noTarget')}</span>}
            {targets.map((t) => (
              <button key={t.id} onClick={() => setTargetId(t.id)} className={`rounded-full border px-2.5 py-0.5 ${targetId === t.id ? 'border-gold bg-gold/15 text-gold' : 'border-gold/15 text-parch-dim hover:text-parch'}`}>
                {t.name}
              </button>
            ))}
            {!skill.ally && targets.length > 0 && <span className="text-[10px] text-parch-dim/70">{T('act.clickStage')}</span>}
          </div>
        )}
        <div className="scroll-thin mb-2 flex gap-1.5 overflow-x-auto pb-1">
          {QUICK.map((k) => T(k)).map((q) => (
            <button key={q} onClick={() => setText(q)} className="shrink-0 rounded-full border border-gold/15 bg-ink/60 px-3 py-1 text-xs text-parch-dim transition hover:border-ember/50 hover:text-parch">
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAction();
              }
            }}
            rows={2}
            maxLength={500}
            placeholder={skill ? T('act.phSkill', { skill: D.skillName(skill), name: c.name }) : T('act.ph', { name: c.name })}
            className="max-h-40 min-h-[52px] flex-1 resize-none rounded-xl border border-gold/20 bg-ink/80 px-4 py-3 font-story text-lg outline-none focus:border-ember/60"
          />
          <button
            onClick={sendAction}
            disabled={busy || (!text.trim() && !skill)}
            className="flex h-[52px] items-center gap-2 rounded-xl bg-gradient-to-b from-ember to-[#c4621f] px-4 font-display font-bold text-ink transition active:scale-95 disabled:opacity-50"
          >
            <Send size={18} /> <span className="hidden sm:inline">{T('act.send')}</span>
          </button>
        </div>
        {isHost && room.submitted.length > 0 && (
          <button onClick={() => call('action:force')} className="mt-2 flex items-center gap-1.5 text-xs text-parch-dim hover:text-parch">
            <FastForward size={13} /> {T('act.continueN', { n: room.submitted.length, m: actors.length })}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-gold/10 bg-gradient-to-t from-ink to-ink/80 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
      <div className="mx-auto max-w-3xl">
        {body}
        {error && <p className="mt-1.5 text-center text-sm text-blood">{error}</p>}
      </div>
    </div>
  );
}

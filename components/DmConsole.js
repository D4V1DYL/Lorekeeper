'use client';
import { useEffect, useMemo, useState } from 'react';
import { Bot, Dices, Eye, FastForward, Feather, Globe2, Loader2, Plus, ScrollText, Send, Skull, Swords, Trash2, Users, X } from 'lucide-react';
import { BIOMES, ENEMY_TYPES, STATS } from '@/lib/data';
import { emit, getSocket } from '@/lib/client';
import { useLang } from '@/lib/lang';

const QTYPES = ['main', 'investigation', 'political', 'survival', 'heist', 'mystery', 'moral', 'war', 'exploration', 'side'];
const input = 'min-w-0 rounded-md border border-gold/20 bg-ink/80 px-2 py-1 text-xs outline-none focus:border-ember/60';
const chip = 'rounded-full border border-gold/20 px-2 py-0.5 text-[11px] text-parch-dim hover:border-gold/50 hover:text-parch';

/**
 * Konsol Dungeon Master manusia: tulis narasi, lalu (opsional) ubah dunia lewat alat cepat.
 * Semua perubahan dikirim sekaligus sebagai satu objek STATE, sama persis dengan yang dipakai AI.
 */
export default function DmConsole({ room, me, isHost }) {
  const { T, D } = useLang();
  const [text, setText] = useState('');
  const [st, setSt] = useState({});
  const [tab, setTab] = useState(null);
  const [draft, setDraft] = useState({ loading: false, error: '' });
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [secrets, setSecrets] = useState(null);

  const heroes = room.players.filter((p) => p.character);
  const myTurn = room.phase === 'dmTurn';
  const ready = room.submitted.length;
  const need = heroes.filter((p) => p.character.hp > 0 && p.connected).length;

  // draf AI hanya dikirim server ke socket DM
  useEffect(() => {
    const s = getSocket();
    const on = (d) => {
      if (d.loading) return setDraft({ loading: true, error: '' });
      if (d.error) return setDraft({ loading: false, error: d.error });
      setDraft({ loading: false, error: '' });
      if (d.narration) setText(d.narration);
      if (d.state && typeof d.state === 'object') setSt(d.state);
    };
    s.on('dm:draft', on);
    return () => s.off('dm:draft', on);
  }, []);

  const set = (k, v) => setSt((o) => ({ ...o, [k]: v }));
  const bump = (k, name, d) => setSt((o) => ({ ...o, [k]: { ...(o[k] || {}), [name]: (o[k]?.[name] || 0) + d } }));
  const enemies = st.enemies || room.enemies.map(({ name, type, hp, maxHp }) => ({ name, type, hp, maxHp }));
  const setEnemies = (list) => set('enemies', list);

  const summary = useMemo(() => {
    const out = [];
    if (st.enemies) out.push(T('dmc.sumEnemies', { n: st.enemies.length }));
    if (st.rolls?.length) out.push(T('dmc.sumRolls', { n: st.rolls.length }));
    for (const [n, v] of Object.entries(st.hp || {})) if (v) out.push(`${n} ${v > 0 ? '+' : ''}${v} HP`);
    for (const [n, v] of Object.entries(st.gold || {})) if (v) out.push(`${n} ${v > 0 ? '+' : ''}${v} gold`);
    if (st.xp) out.push(`+${st.xp} XP`);
    for (const [n, v] of Object.entries(st.rep || {})) if (v) out.push(`${n} ${v > 0 ? '+' : ''}${v}`);
    if (st.consequence) out.push(T('dmc.sumCons'));
    if (st.choices?.length) out.push(T('dmc.sumChoices', { n: st.choices.length }));
    if (st.quests?.length) out.push(T('dmc.sumQuests', { n: st.quests.length }));
    if (st.npcs?.length) out.push(T('dmc.sumNpcs', { n: st.npcs.length }));
    if (st.titles && Object.keys(st.titles).length) out.push(T('dmc.sumTitles'));
    if (st.items && Object.keys(st.items).length) out.push(T('dmc.sumItems'));
    if (st.biome) out.push(st.biome);
    if (typeof st.combat === 'boolean') out.push(st.combat ? T('dmc.combatOn') : T('dmc.combatOff'));
    if (st.end) out.push(T('dmc.end'));
    return out;
  }, [st, T]);

  async function send() {
    setError('');
    setBusy(true);
    const res = await emit('dm:narrate', { text, state: st });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setText('');
    setSt({});
    setTab(null);
  }

  const TABS = [
    ['enemy', Swords, T('dmc.tabEnemy')],
    ['roll', Dices, T('dmc.tabRoll')],
    ['hero', Users, T('dmc.tabHero')],
    ['world', Globe2, T('dmc.tabWorld')],
    ['secret', Eye, T('dmc.tabSecret')],
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${myTurn ? 'bg-ember/20 text-ember' : 'bg-ink/60 text-parch-dim'}`}>
          <Feather size={13} /> {myTurn ? T('dmc.yourTurn') : room.phase === 'rolling' ? T('dmc.waitRolls') : T('dmc.waitPlayers', { n: ready, m: need })}
        </span>
        {room.phase === 'action' && ready > 0 && (
          <button onClick={() => emit('action:force')} className="flex items-center gap-1 rounded-full border border-gold/30 px-2.5 py-1 text-gold hover:bg-gold/10">
            <FastForward size={12} /> {T('dmc.resolve')}
          </button>
        )}
        {room.phase === 'rolling' && (
          <button onClick={() => emit('roll:auto')} className="flex items-center gap-1 rounded-full border border-gold/30 px-2.5 py-1 text-gold hover:bg-gold/10">
            <Dices size={12} /> {T('act.autoRoll')}
          </button>
        )}
        <span className="ml-auto flex items-center gap-1">
          <input value={hint} onChange={(e) => setHint(e.target.value)} maxLength={300} placeholder={T('dmc.hintPh')} className={`${input} w-40 sm:w-56`} />
          <button
            disabled={draft.loading}
            onClick={async () => {
              setDraft({ loading: true, error: '' });
              const r = await emit('dm:draft', { hint });
              if (!r.ok) setDraft({ loading: false, error: r.error });
            }}
            className="flex items-center gap-1 rounded-full border border-arcane/40 px-2.5 py-1 text-arcane hover:bg-arcane/10 disabled:opacity-50"
            title={T('dmc.draftTip')}
          >
            {draft.loading ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />} {T('dmc.draft')}
          </button>
        </span>
      </div>
      {draft.error && <p className="text-xs text-blood">{draft.error}</p>}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder={myTurn ? T('dmc.ph') : T('dmc.phInterject')}
        className="scroll-thin w-full resize-y rounded-xl border border-gold/20 bg-ink/80 px-3 py-2 font-story text-lg leading-snug outline-none focus:border-ember/60"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={async () => {
              setTab(tab === id ? null : id);
              if (id === 'secret') {
                const r = await emit('dm:secrets');
                if (r.ok) setSecrets(r);
              }
            }}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs ${tab === id ? 'border-ember bg-ember/10 text-ember' : 'border-gold/15 text-parch-dim hover:text-parch'}`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
        <button
          onClick={send}
          disabled={busy || (!text.trim() && !summary.length)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-ember to-[#c4621f] px-4 py-1.5 font-display text-sm font-bold text-ink disabled:opacity-40"
        >
          <Send size={14} /> {myTurn ? T('dmc.send') : T('dmc.sendInterject')}
        </button>
      </div>

      {summary.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <span className="text-parch-dim">{T('dmc.pending')}</span>
          {summary.map((s, i) => (
            <span key={i} className="rounded-full bg-gold/10 px-2 py-0.5 text-gold">
              {s}
            </span>
          ))}
          <button onClick={() => setSt({})} className="text-parch-dim hover:text-blood" title={T('dmc.clear')}>
            <X size={12} />
          </button>
        </div>
      )}
      {error && <p className="text-xs text-blood">{error}</p>}

      {tab && (
        <div className="scroll-thin max-h-[28vh] overflow-y-auto rounded-xl border border-gold/10 bg-black/30 p-2.5 text-xs">
          {tab === 'enemy' && <EnemyTool enemies={enemies} setEnemies={setEnemies} D={D} T={T} combat={st.combat} setCombat={(v) => set('combat', v)} />}
          {tab === 'roll' && <RollTool heroes={heroes} rolls={st.rolls || []} setRolls={(v) => set('rolls', v)} T={T} />}
          {tab === 'hero' && <HeroTool heroes={heroes} st={st} bump={bump} set={set} setSt={setSt} T={T} />}
          {tab === 'world' && <WorldTool room={room} st={st} set={set} bump={bump} T={T} D={D} />}
          {tab === 'secret' && <SecretTool secrets={secrets} T={T} />}
        </div>
      )}
    </div>
  );
}

function EnemyTool({ enemies, setEnemies, D, T, combat, setCombat }) {
  const [type, setType] = useState('goblin');
  const [name, setName] = useState('');
  const [hp, setHp] = useState(8);
  return (
    <div className="space-y-2">
      {enemies.length === 0 && <p className="text-parch-dim italic">{T('dmc.noEnemies')}</p>}
      {enemies.map((e, i) => (
        <div key={`${e.name}-${i}`} className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate">
            {e.name} <span className="text-parch-dim">({D.enemy(e.type, ENEMY_TYPES[e.type]?.label)})</span>
          </span>
          <span className="w-14 text-right text-blood">
            {e.hp}/{e.maxHp ?? e.hp}
          </span>
          {[-5, -1].map((d) => (
            <button key={d} className={chip} onClick={() => setEnemies(enemies.map((x, k) => (k === i ? { ...x, hp: Math.max(0, x.hp + d) } : x)))}>
              {d}
            </button>
          ))}
          <button className={chip} title={T('dmc.flee')} onClick={() => setEnemies(enemies.filter((_, k) => k !== i))}>
            <Trash2 size={11} />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-gold/10 pt-2">
        <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
          {Object.keys(ENEMY_TYPES).map((k) => (
            <option key={k} value={k}>
              {D.enemy(k, ENEMY_TYPES[k].label)}
            </option>
          ))}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={28} placeholder={T('dmc.enemyName')} className={`${input} w-32`} />
        <input type="number" min={1} max={300} value={hp} onChange={(e) => setHp(+e.target.value)} className={`${input} w-16`} />
        <button
          className={`${chip} flex items-center gap-1`}
          disabled={enemies.length >= 6}
          onClick={() => {
            const base = name.trim() || D.enemy(type, ENEMY_TYPES[type].label);
            let n = base;
            for (let k = 2; enemies.some((x) => x.name.toLowerCase() === n.toLowerCase()); k++) n = `${base} ${k}`;
            setEnemies([...enemies, { name: n, type, hp, maxHp: hp }]);
            setName('');
            if (combat === undefined) setCombat(true);
          }}
        >
          <Plus size={11} /> {T('dmc.addEnemy')}
        </button>
        <label className="ml-auto flex items-center gap-1 text-parch-dim">
          <input type="checkbox" checked={combat ?? false} onChange={(e) => setCombat(e.target.checked)} className="accent-[#f08a3c]" /> {T('dmc.combat')}
        </label>
      </div>
    </div>
  );
}

function RollTool({ heroes, rolls, setRolls, T }) {
  const [player, setPlayer] = useState(heroes[0]?.character.name || '');
  const [stat, setStat] = useState('DEX');
  const [dc, setDc] = useState(12);
  const [reason, setReason] = useState('');
  return (
    <div className="space-y-2">
      {rolls.map((r, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Dices size={12} className="text-gold" />
          <span className="flex-1">
            {r.player} · {r.stat} DC {r.dc} {r.reason && <span className="text-parch-dim">({r.reason})</span>}
          </span>
          <button className={chip} onClick={() => setRolls(rolls.filter((_, k) => k !== i))}>
            <Trash2 size={11} />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        <select value={player} onChange={(e) => setPlayer(e.target.value)} className={input}>
          {heroes.map((p) => (
            <option key={p.id}>{p.character.name}</option>
          ))}
        </select>
        <select value={stat} onChange={(e) => setStat(e.target.value)} className={input}>
          {STATS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={dc} onChange={(e) => setDc(+e.target.value)} className={input} title="DC">
          {[8, 10, 12, 15, 18, 21].map((d) => (
            <option key={d} value={d}>
              DC {d}
            </option>
          ))}
        </select>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder={T('dmc.reason')} className={`${input} flex-1`} />
        <button
          className={`${chip} flex items-center gap-1`}
          onClick={() => {
            if (!player || rolls.some((r) => r.player === player)) return;
            setRolls([...rolls, { player, stat, dc, reason }]);
            setReason('');
          }}
        >
          <Plus size={11} /> {T('dmc.addRoll')}
        </button>
      </div>
      <p className="text-[10px] text-parch-dim">{T('dmc.rollTip')}</p>
    </div>
  );
}

function HeroTool({ heroes, st, bump, set, setSt, T }) {
  const [item, setItem] = useState({});
  const [title, setTitle] = useState({});
  return (
    <div className="space-y-2">
      {heroes.map((p) => {
        const c = p.character;
        const n = c.name;
        return (
          <div key={p.id} className="flex flex-wrap items-center gap-1.5 border-b border-gold/5 pb-1.5">
            <span className="w-24 truncate font-semibold">{n}</span>
            <span className="w-16 text-parch-dim">
              {c.hp}/{c.maxHp}
              {st.hp?.[n] ? <b className={st.hp[n] > 0 ? 'text-moss' : 'text-blood'}> {st.hp[n] > 0 ? '+' : ''}{st.hp[n]}</b> : null}
            </span>
            {[-5, -2, 2, 5].map((d) => (
              <button key={d} className={chip} onClick={() => bump('hp', n, d)}>
                {d > 0 ? `+${d}` : d} HP
              </button>
            ))}
            <button className={chip} onClick={() => bump('gold', n, 10)}>
              +10g
            </button>
            <input value={item[n] || ''} onChange={(e) => setItem({ ...item, [n]: e.target.value })} maxLength={60} placeholder={T('dmc.item')} className={`${input} w-28`} />
            <button
              className={chip}
              onClick={() => {
                if (!item[n]?.trim()) return;
                setSt((o) => ({ ...o, items: { ...(o.items || {}), [n]: { add: [...(o.items?.[n]?.add || []), item[n].trim()] } } }));
                setItem({ ...item, [n]: '' });
              }}
            >
              <Plus size={11} />
            </button>
            <input value={title[n] || ''} onChange={(e) => setTitle({ ...title, [n]: e.target.value })} maxLength={40} placeholder={T('dmc.title')} className={`${input} w-28`} />
            <button
              className={chip}
              onClick={() => {
                if (!title[n]?.trim()) return;
                setSt((o) => ({ ...o, titles: { ...(o.titles || {}), [n]: title[n].trim() } }));
                setTitle({ ...title, [n]: '' });
              }}
            >
              <Plus size={11} />
            </button>
          </div>
        );
      })}
      <label className="flex items-center gap-1.5">
        XP {T('dmc.party')}
        <input type="number" min={0} max={200} step={10} value={st.xp || 0} onChange={(e) => set('xp', +e.target.value)} className={`${input} w-20`} />
      </label>
    </div>
  );
}

function WorldTool({ room, st, set, bump, T, D }) {
  const W = room.world || {};
  const [fac, setFac] = useState('');
  const [q, setQ] = useState({ title: '', type: 'side', desc: '' });
  const [npc, setNpc] = useState({ name: '', role: '', attitude: 'neutral', note: '', secret: '' });
  const factions = [...new Set([...Object.keys(W.factions || {}), ...Object.keys(st.rep || {})])];
  const choices = st.choices || [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <select value={st.biome || ''} onChange={(e) => set('biome', e.target.value || undefined)} className={input}>
          <option value="">{T('dmc.biome')}</option>
          {BIOMES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <input value={st.scene || ''} onChange={(e) => set('scene', e.target.value)} maxLength={80} placeholder={T('dmc.scene')} className={`${input} flex-1`} />
        <label className="flex items-center gap-1 text-blood">
          <input type="checkbox" checked={!!st.end} onChange={(e) => set('end', e.target.checked)} className="accent-[#d0473f]" /> <Skull size={11} /> {T('dmc.end')}
        </label>
      </div>

      <div>
        <p className="mb-1 font-semibold text-parch-dim">{T('world.factions')}</p>
        {factions.map((f) => (
          <div key={f} className="flex items-center gap-1.5">
            <span className="flex-1 truncate">
              {f} <span className="text-parch-dim">{W.factions?.[f] ?? 0}</span>
              {st.rep?.[f] ? <b className={st.rep[f] > 0 ? 'text-moss' : 'text-blood'}> {st.rep[f] > 0 ? '+' : ''}{st.rep[f]}</b> : null}
            </span>
            {[-10, -5, 5, 10].map((d) => (
              <button key={d} className={chip} onClick={() => bump('rep', f, d)}>
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>
        ))}
        <div className="mt-1 flex gap-1.5">
          <input value={fac} onChange={(e) => setFac(e.target.value)} maxLength={36} placeholder={T('dmc.newFaction')} className={`${input} flex-1`} />
          <button className={chip} onClick={() => fac.trim() && (bump('rep', fac.trim(), 5), setFac(''))}>
            <Plus size={11} />
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 font-semibold text-parch-dim">{T('dmc.consequence')}</p>
        <input value={st.consequence || ''} onChange={(e) => set('consequence', e.target.value)} maxLength={220} placeholder={T('dmc.consequencePh')} className={`${input} w-full`} />
      </div>

      <div>
        <p className="mb-1 font-semibold text-parch-dim">{T('dmc.choices')}</p>
        {[0, 1, 2, 3].map((i) => (
          <input
            key={i}
            value={choices[i] || ''}
            onChange={(e) => {
              const next = [...choices];
              next[i] = e.target.value;
              set('choices', next);
            }}
            maxLength={90}
            placeholder={`${T('dmc.choice')} ${i + 1}`}
            className={`${input} mb-1 w-full`}
          />
        ))}
      </div>

      <div>
        <p className="mb-1 font-semibold text-parch-dim">{T('world.journal')}</p>
        {(W.journal || []).filter((j) => j.status === 'active').map((j) => (
          <div key={j.title} className="flex items-center gap-1.5">
            <span className="flex-1 truncate">{j.title}</span>
            {['done', 'failed'].map((s) => (
              <button key={s} className={chip} onClick={() => set('quests', [...(st.quests || []).filter((x) => x.title !== j.title), { title: j.title, status: s }])}>
                {T(`world.q.${s}`)}
              </button>
            ))}
          </div>
        ))}
        <div className="mt-1 flex flex-wrap gap-1.5">
          <input value={q.title} onChange={(e) => setQ({ ...q, title: e.target.value })} maxLength={60} placeholder={T('dmc.questTitle')} className={`${input} flex-1`} />
          <select value={q.type} onChange={(e) => setQ({ ...q, type: e.target.value })} className={input}>
            {QTYPES.map((t) => (
              <option key={t} value={t}>
                {T(`world.qt.${t}`)}
              </option>
            ))}
          </select>
          <input value={q.desc} onChange={(e) => setQ({ ...q, desc: e.target.value })} maxLength={200} placeholder={T('dmc.questDesc')} className={`${input} w-full`} />
          <button className={`${chip} flex items-center gap-1`} onClick={() => q.title.trim() && (set('quests', [...(st.quests || []), { ...q, status: 'active' }]), setQ({ title: '', type: 'side', desc: '' }))}>
            <ScrollText size={11} /> {T('dmc.addQuest')}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 font-semibold text-parch-dim">{T('world.npcs')}</p>
        <div className="flex flex-wrap gap-1.5">
          <input value={npc.name} onChange={(e) => setNpc({ ...npc, name: e.target.value })} maxLength={36} placeholder={T('dmc.npcName')} className={`${input} w-28`} />
          <input value={npc.role} onChange={(e) => setNpc({ ...npc, role: e.target.value })} maxLength={48} placeholder={T('dmc.npcRole')} className={`${input} w-28`} />
          <select value={npc.attitude} onChange={(e) => setNpc({ ...npc, attitude: e.target.value })} className={input}>
            {['friendly', 'neutral', 'hostile', 'dead'].map((a) => (
              <option key={a} value={a}>
                {T(`world.att.${a}`)}
              </option>
            ))}
          </select>
          <input value={npc.note} onChange={(e) => setNpc({ ...npc, note: e.target.value })} maxLength={160} placeholder={T('dmc.npcNote')} className={`${input} flex-1`} />
          <input value={npc.secret} onChange={(e) => setNpc({ ...npc, secret: e.target.value })} maxLength={160} placeholder={T('dmc.npcSecret')} className={`${input} w-full`} />
          <button className={`${chip} flex items-center gap-1`} onClick={() => npc.name.trim() && (set('npcs', [...(st.npcs || []), npc]), setNpc({ name: '', role: '', attitude: 'neutral', note: '', secret: '' }))}>
            <Plus size={11} /> {T('dmc.addNpc')}
          </button>
        </div>
        {(W.npcs || []).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {W.npcs.map((n) => (
              <button
                key={n.name}
                className={chip}
                title={T('dmc.npcUpdate')}
                onClick={() => setNpc({ name: n.name, role: n.role, attitude: n.attitude, note: n.note, secret: '' })}
              >
                {n.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SecretTool({ secrets, T }) {
  if (!secrets) return <p className="text-parch-dim italic">…</p>;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-parch-dim">{T('dmc.secretTip')}</p>
      {secrets.weak?.map((b) => (
        <p key={b.name}>
          <b>{b.name}</b>: {T('dmc.weak')} <span className="text-ember">{T(`weak.${b.weak}`)}</span>
        </p>
      ))}
      {secrets.npcs?.length ? (
        secrets.npcs.map((n) => (
          <p key={n.name}>
            <b>{n.name}</b> <span className="text-parch-dim">({n.role})</span>: {n.secret || <i className="text-parch-dim">{T('dmc.noSecret')}</i>}
          </p>
        ))
      ) : (
        <p className="text-parch-dim italic">{T('dmc.noNpcs')}</p>
      )}
    </div>
  );
}

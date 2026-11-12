'use client';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Check, Copy, Crown, KeyRound, Link as LinkIcon, Lock, Play, Wifi, WifiOff } from 'lucide-react';
import HostControls from './HostControls';
import DmStylePicker, { DmModePicker, LengthPicker } from './DmStylePicker';
import { Sigil } from './ClassIcon';
import ChatPanel from './ChatPanel';
import { CAMPAIGNS, CLASSES, RACES } from '@/lib/data';
import { useLang } from '@/lib/lang';
import LangToggle from './LangToggle';
import { emit } from '@/lib/client';

export default function Lobby({ room, me, isHost, onEditChar }) {
  const [copied, setCopied] = useState('');
  const [premise, setPremise] = useState(room.settings.premise);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [pw, setPw] = useState('');
  const [pwSaved, setPwSaved] = useState(false);
  const { T, D } = useLang();

  useEffect(() => {
    if (!isHost) setPremise(room.settings.premise);
  }, [room.settings.premise, isHost]);

  const copy = async (what) => {
    const text = what === 'link' ? `${location.origin}/room/${room.code}` : room.code;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopied(what);
    setTimeout(() => setCopied(''), 1500);
  };

  const setSetting = (patch) => emit('room:settings', patch);
  const ready = room.players.filter((p) => p.character && p.id !== room.dmId).length;
  const waiting = room.players.filter((p) => !p.character && p.id !== room.dmId);

  async function start() {
    setError('');
    setStarting(true);
    const res = await emit('game:start');
    setStarting(false);
    if (!res.ok) setError(res.error);
  }

  const camp = CAMPAIGNS.find((c) => c.id === room.settings.campaign);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="text-center">
        <div className="mb-3 flex justify-center"><LangToggle /></div>
        <p className="font-display text-xs tracking-[0.4em] text-ember uppercase">{T('lobby.code')}</p>
        <motion.h1 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="gold-text mt-1 font-display text-6xl font-black tracking-[0.25em] sm:text-7xl">
          {room.code}
        </motion.h1>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => copy('code')} className="flex items-center gap-1.5 rounded-full border border-gold/30 px-4 py-1.5 text-sm text-gold hover:bg-gold/10">
            {copied === 'code' ? <Check size={14} /> : <Copy size={14} />} {T('lobby.copyCode')}
          </button>
          <button onClick={() => copy('link')} className="flex items-center gap-1.5 rounded-full border border-gold/30 px-4 py-1.5 text-sm text-gold hover:bg-gold/10">
            {copied === 'link' ? <Check size={14} /> : <LinkIcon size={14} />} {T('lobby.copyLink')}
          </button>
        </div>
      </header>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="panel rounded-2xl p-5">
          <h2 className="font-display text-lg font-bold">
            {T('lobby.party')} <span className="text-parch-dim">({room.players.length}/6)</span>
          </h2>
          <ul className="mt-4 space-y-2">
            {room.players.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-gold/10 bg-ink/40 p-3"
              >
                {p.character ? <Sigil character={p.character} size={40} /> : <div className="h-10 w-10 shrink-0 rounded-full border border-dashed border-gold/30" />}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-display font-bold">
                    {p.character?.name || p.name}
                    {room.hostId === p.id && <Crown size={14} className="text-gold" />}
                    {p.id === me.id && <span className="text-xs font-normal text-parch-dim">{T('common.you')}</span>}
                  </p>
                  <p className="text-xs text-parch-dim">
                    {p.id === room.dmId ? (
                      <span className="text-arcane">{T('party.dm')}</span>
                    ) : p.character ? (
                      `${D.race(p.character.raceId, RACES[p.character.raceId].label)} ${CLASSES[p.character.classId].label} · ${p.character.maxHp} HP · AC ${p.character.ac}`
                    ) : (
                      T('lobby.making')
                    )}
                  </p>
                </div>
                <HostControls room={room} me={me} player={p} />
                {p.connected ? <Wifi size={14} className="text-moss" /> : <WifiOff size={14} className="text-parch-dim" />}
              </motion.li>
            ))}
          </ul>
          <button onClick={onEditChar} className="mt-3 text-sm text-parch-dim underline-offset-4 hover:text-parch hover:underline">
            {T('lobby.editChar')}
          </button>
          <div className="rune-divider my-4" />
          <ChatPanel room={room} me={me} className="h-80" />
        </section>

        <section className="panel rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{T('lobby.adventure')}</h2>
            {!isHost && <span className="text-xs text-parch-dim">{T('lobby.byHost')}</span>}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {CAMPAIGNS.map((c) => (
              <button
                key={c.id}
                disabled={!isHost}
                onClick={() => setSetting({ campaign: c.id })}
                className={`rounded-xl border p-3 text-left transition disabled:cursor-default ${room.settings.campaign === c.id ? 'border-ember bg-ember/[0.08]' : 'border-gold/10 bg-ink/40 enabled:hover:border-gold/30'}`}
              >
                <p className="font-display text-sm font-bold">{D.campaignTitle(c.id, c.title)}</p>
              </button>
            ))}
          </div>

          {camp?.hook && <p className="mt-4 font-story text-lg leading-snug text-parch/85 italic">“{D.campaignHook(camp.id, camp.hook)}”</p>}

          <label className="mt-4 block text-xs font-semibold tracking-widest text-parch-dim uppercase">
            {room.settings.campaign === 'custom' ? T('lobby.premiseReq') : T('lobby.notes')}
          </label>
          <textarea
            value={premise}
            disabled={!isHost}
            onChange={(e) => setPremise(e.target.value)}
            onBlur={() => isHost && setSetting({ premise })}
            rows={3}
            maxLength={600}
            placeholder={room.settings.campaign === 'custom' ? T('lobby.premisePh') : T('lobby.notesPh')}
            className="mt-2 w-full resize-none rounded-lg border border-gold/20 bg-ink/70 px-3 py-2 font-story text-lg outline-none focus:border-ember/70 disabled:opacity-70"
          />

          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-parch-dim">{T('lobby.narration')}</span>
            {[
              ['id', 'Indonesia'],
              ['en', 'English'],
            ].map(([v, l]) => (
              <button
                key={v}
                disabled={!isHost}
                onClick={() => setSetting({ language: v })}
                className={`rounded-full border px-3 py-1 ${room.settings.language === v ? 'border-ember text-ember' : 'border-gold/20 text-parch-dim'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <DmModePicker room={room} isHost={isHost} />
          {isHost && room.dmId && room.dmId !== me.id && (
            <button onClick={() => emit('dm:seat', { to: me.id })} className="mt-1.5 text-xs text-arcane underline-offset-4 hover:underline">
              {T('dmMode.takeSeat')}
            </button>
          )}
          <DmStylePicker room={room} isHost={isHost} />
          <LengthPicker room={room} isHost={isHost} />

          <div className="mt-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-parch-dim uppercase">
              {room.settings.hasPassword ? <Lock size={13} className="text-gold" /> : <KeyRound size={13} />} {T('room.password')}
              {room.settings.hasPassword && <span className="font-normal tracking-normal text-gold normal-case">· {T('room.locked')}</span>}
            </p>
            {isHost ? (
              <form
                className="mt-2 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await emit('room:settings', { password: pw });
                  if (res.ok) {
                    setPwSaved(true);
                    setTimeout(() => setPwSaved(false), 1500);
                  }
                }}
              >
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  maxLength={40}
                  placeholder={T('room.lockPh')}
                  className="min-w-0 flex-1 rounded-lg border border-gold/20 bg-ink/70 px-3 py-2 text-sm outline-none focus:border-ember/70"
                />
                <button className="rounded-lg border border-gold/30 px-3 text-sm text-gold hover:bg-gold/10">{pwSaved ? <Check size={14} /> : pw ? T('room.lock') : T('room.unlock')}</button>
              </form>
            ) : (
              <p className="mt-1 text-xs text-parch-dim">{room.settings.hasPassword ? T('room.lockedInfo') : T('room.openInfo')}</p>
            )}
          </div>

          <div className="rune-divider my-5" />
          <p className="text-xs text-parch-dim">
            {room.dmId ? T('lobby.dmAssistModel') : 'Dungeon Master'}: <span className={room.dm.mock ? 'text-gold' : 'text-moss'}>{room.dm.mock ? T('lobby.dmDemo') : room.dm.model}</span>
          </p>

          {isHost ? (
            <>
              <button
                onClick={start}
                disabled={starting || ready === 0}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-ember to-[#c4621f] py-3.5 font-display text-lg font-bold tracking-wider text-ink shadow-[0_10px_30px_-10px_rgba(240,138,60,.8)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                <Play size={18} /> {starting ? T('lobby.starting') : T('lobby.start')}
              </button>
              {waiting.length > 0 && <p className="mt-2 text-center text-xs text-parch-dim">{T('lobby.notReady', { names: waiting.map((p) => p.name).join(', ') })}</p>}
            </>
          ) : (
            <p className="glow-pulse mt-3 text-center font-display text-parch-dim">{T('lobby.waiting')}</p>
          )}
          {error && <p className="mt-2 text-center text-sm text-blood">{error}</p>}
        </section>
      </div>
    </main>
  );
}

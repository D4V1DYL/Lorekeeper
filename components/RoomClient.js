'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { KeyRound, LogIn } from 'lucide-react';
import Atmosphere from './Atmosphere';
import CharacterCreator from './CharacterCreator';
import Lobby from './Lobby';
import GameTable from './GameTable';
import D20 from './D20';
import { useLang } from '@/lib/lang';
import LangToggle from './LangToggle';
import { armAudio, sfx } from '@/lib/sound';
import { clearSession, emit, getSocket, lastName, loadSession, rememberName, saveSession } from '@/lib/client';

const DiceOverlay = dynamic(() => import('./DiceOverlay'), { ssr: false });

export default function RoomClient({ code }) {
  const [session, setSession] = useState(undefined); // undefined = memuat, null = belum join
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(true);
  const [dice, setDice] = useState([]);
  const [editChar, setEditChar] = useState(false);
  const { T } = useLang();

  useEffect(() => setSession(loadSession(code)), [code]);
  useEffect(() => armAudio(), []);

  useEffect(() => {
    if (!session) return;
    const s = getSocket();
    const join = () =>
      s.emit('room:join', { code, token: session.token }, (res) => {
        if (!res?.ok) {
          clearSession(code);
          setSession(null);
          setError(res?.code === 'err.name' ? T('room.sessionGone') : res?.error || T('room.joinFail'));
        }
      });
    const onState = (r) => setRoom(r);
    const onDelta = ({ id, delta }) =>
      setRoom((r) => (r ? { ...r, log: r.log.map((e) => (e.id === id ? { ...e, text: (e.text || '') + delta } : e)) } : r));
    const onChat = (m) => {
      if (m.pid !== session.playerId) sfx('chat');
      setRoom((r) => (r ? { ...r, chat: [...r.chat, m].slice(-80) } : r));
    };
    const onKicked = () => {
      clearSession(code);
      setRoom(null);
      setSession(null);
      setError(T('room.kicked'));
    };
    const onPlans = (plans) => setRoom((r) => (r ? { ...r, plans } : r));
    const onDice = (d) => setDice((q) => [...q, { ...d, key: `${Date.now()}-${Math.random()}` }].slice(-6));
    const onConnect = () => {
      setOnline(true);
      join();
    };
    const onDisconnect = () => setOnline(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('room:state', onState);
    s.on('dm:delta', onDelta);
    s.on('dice:rolled', onDice);
    s.on('chat:msg', onChat);
    s.on('room:plans', onPlans);
    s.on('room:kicked', onKicked);
    if (s.connected) join();
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('room:state', onState);
      s.off('dm:delta', onDelta);
      s.off('dice:rolled', onDice);
      s.off('chat:msg', onChat);
      s.off('room:plans', onPlans);
      s.off('room:kicked', onKicked);
    };
  }, [session, code]);

  const nextDice = useCallback(() => setDice((q) => q.slice(1)), []);

  if (session === undefined) return <Loading />;
  if (session === null) return <JoinGate code={code} error={error} onJoined={(s) => { setError(''); setSession(s); }} />;
  if (!room) return <Loading />;

  const me = room.players.find((p) => p.id === session.playerId);
  if (!me) return <Loading />;
  const isHost = room.hostId === me.id;

  let view;
  if (!me.character || (editChar && room.phase === 'lobby')) {
    view = <CharacterCreator me={me} room={room} onDone={() => setEditChar(false)} />;
  } else if (room.phase === 'lobby') {
    view = <Lobby room={room} me={me} isHost={isHost} onEditChar={() => setEditChar(true)} />;
  } else {
    view = <GameTable room={room} me={me} isHost={isHost} />;
  }

  return (
    <>
      <Atmosphere rune={room.phase === 'lobby' || !me.character} dim={room.phase !== 'lobby'} />
      {!online && (
        <div className="fixed inset-x-0 top-0 z-40 bg-blood/90 py-1.5 text-center text-sm font-medium text-white">{T('room.offline')}</div>
      )}
      {view}
      <DiceOverlay roll={dice[0] || null} onDone={nextDice} />
    </>
  );
}

function Loading() {
  const { T } = useLang();
  return (
    <div className="grid min-h-dvh place-items-center">
      <Atmosphere />
      <div className="flex flex-col items-center gap-3 text-parch-dim">
        <div className="spin-slow" style={{ animationDuration: '3s' }}>
          <D20 size={56} />
        </div>
        <p className="font-display tracking-widest">{T('room.loading')}</p>
      </div>
    </div>
  );
}

function JoinGate({ code, error: initialError, onJoined }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [needPw, setNeedPw] = useState(false);
  const [password, setPassword] = useState('');
  const { T } = useLang();
  useEffect(() => {
    setName(lastName());
    if (/[?&]locked=1/.test(window.location.search)) setNeedPw(true);
  }, []);

  async function join(e) {
    e.preventDefault();
    setBusy(true);
    const res = await emit('room:join', { code, name, password });
    setBusy(false);
    if (res.code === 'err.password') setNeedPw(true);
    if (!res.ok) return setError(needPw || res.code !== 'err.password' ? res.error : T('room.passwordPh'));
    rememberName(name.trim());
    const s = { playerId: res.playerId, token: res.token };
    saveSession(code, s);
    onJoined(s);
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <Atmosphere />
      <LangToggle className="absolute top-4 right-4" />
      <form onSubmit={join} className="panel w-full max-w-sm rounded-2xl p-6">
        <p className="font-display text-xs tracking-[0.4em] text-ember uppercase">{T('room.invite')}</p>
        <h1 className="gold-text mt-1 font-display text-4xl font-black tracking-[0.2em]">{code}</h1>
        <label className="mt-6 block text-xs font-semibold tracking-widest text-parch-dim uppercase">{T('home.name')}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          className="mt-2 w-full rounded-lg border border-gold/20 bg-ink/70 px-4 py-3 text-lg outline-none focus:border-ember/70"
        />
        {needPw && (
          <>
            <label className="mt-4 flex items-center gap-1.5 text-xs font-semibold tracking-widest text-parch-dim uppercase">
              <KeyRound size={13} /> {T('room.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={40}
              placeholder={T('room.passwordPh')}
              className="mt-2 w-full rounded-lg border border-gold/20 bg-ink/70 px-4 py-3 outline-none focus:border-ember/70"
            />
          </>
        )}
        <button disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-ember to-[#c4621f] py-3 font-display font-bold tracking-wider text-ink disabled:opacity-60">
          <LogIn size={18} /> {busy ? T('home.joining') : T('room.sit')}
        </button>
        {error && <p className="mt-3 text-sm text-blood">{error}</p>}
        <Link href="/" className="mt-4 block text-center text-sm text-parch-dim hover:text-parch">
          {T('common.back')}
        </Link>
      </form>
    </main>
  );
}

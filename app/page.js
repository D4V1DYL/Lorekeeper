'use client';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Dices, Feather, LogIn, Plus, ScrollText, Users } from 'lucide-react';
import Atmosphere from '@/components/Atmosphere';
import D20 from '@/components/D20';
import { emit, lastName, rememberName, saveSession } from '@/lib/client';
import { useLang } from '@/lib/lang';
import LangToggle from '@/components/LangToggle';

const fade = (d = 0) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] } });

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const { T, lang } = useLang();

  useEffect(() => setName(lastName()), []);

  async function go(kind) {
    setError('');
    if (!name.trim()) return setError(T('home.errName'));
    if (kind === 'join' && code.trim().length < 4) return setError(T('home.errCode'));
    setBusy(kind);
    const res = kind === 'create' ? await emit('room:create', { name, lang }) : await emit('room:join', { code, name });
    setBusy(null);
    if (res.code === 'err.password') {
      // room terkunci: lanjut ke halaman room yang meminta password
      rememberName(name.trim());
      return router.push(`/room/${code.trim().toUpperCase()}?locked=1`);
    }
    if (!res.ok) return setError(res.error);
    rememberName(name.trim());
    saveSession(res.code, { playerId: res.playerId, token: res.token });
    router.push(`/room/${res.code}`);
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden">
      <Atmosphere />
      <LangToggle className="absolute top-4 right-4 z-10" />
      <section className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
        <motion.div {...fade(0)} className="mb-6">
          <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
            <D20 value={20} size={84} glow />
          </motion.div>
        </motion.div>

        <motion.p {...fade(0.1)} className="font-display text-xs tracking-[0.5em] text-ember uppercase">
          {T('home.tagline')}
        </motion.p>
        <motion.h1 {...fade(0.2)} className="gold-text mt-3 font-display text-5xl font-black tracking-wide sm:text-7xl">
          LOREKEEPER
        </motion.h1>
        <motion.p {...fade(0.3)} className="mt-5 max-w-xl font-story text-xl text-parch/85 sm:text-2xl">
          {T('home.sub')}
        </motion.p>

        <motion.div {...fade(0.45)} className="panel mt-10 w-full max-w-md rounded-2xl p-6 text-left">
          <label className="text-xs font-semibold tracking-widest text-parch-dim uppercase">{T('home.name')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder={T('home.namePh')}
            className="mt-2 w-full rounded-lg border border-gold/20 bg-ink/70 px-4 py-3 text-lg outline-none transition focus:border-ember/70"
          />

          <button
            onClick={() => go('create')}
            disabled={!!busy}
            className="group mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-ember to-[#c4621f] px-4 py-3 font-display font-bold tracking-wider text-ink shadow-[0_10px_30px_-10px_rgba(240,138,60,.8)] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            <Plus size={18} className="transition group-hover:rotate-90" />
            {busy === 'create' ? T('home.creating') : T('home.create')}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-parch-dim">
            <div className="rune-divider flex-1" /> {T('home.orJoin')} <div className="rune-divider flex-1" />
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && go('join')}
              maxLength={4}
              placeholder={T('home.codePh')}
              className="w-28 rounded-lg border border-gold/20 bg-ink/70 px-3 py-3 text-center font-display text-xl tracking-[0.3em] outline-none focus:border-ember/70"
            />
            <button
              onClick={() => go('join')}
              disabled={!!busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gold/40 px-4 py-3 font-display font-bold tracking-wider text-gold transition hover:bg-gold/10 active:scale-[0.98] disabled:opacity-60"
            >
              <LogIn size={18} /> {busy === 'join' ? T('home.joining') : T('home.join')}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-blood">{error}</p>}
        </motion.div>

        <motion.ul {...fade(0.6)} className="mt-12 grid w-full max-w-3xl gap-4 text-left sm:grid-cols-3">
          {[
            [Users, T('home.f1t'), T('home.f1d')],
            [Feather, T('home.f2t'), T('home.f2d')],
            [Dices, T('home.f3t'), T('home.f3d')],
          ].map(([Icon, t, d]) => (
            <li key={t} className="panel rounded-xl p-4">
              <Icon size={20} className="text-ember" />
              <p className="mt-2 font-display font-bold text-parch">{t}</p>
              <p className="mt-1 text-sm text-parch-dim">{d}</p>
            </li>
          ))}
        </motion.ul>

        <motion.p {...fade(0.75)} className="mt-10 flex items-center gap-2 text-xs text-parch-dim/70">
          <ScrollText size={14} /> {T('home.saved')}
        </motion.p>
      </section>
    </main>
  );
}

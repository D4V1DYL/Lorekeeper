'use client';
import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/client';
import { ENEMY_TYPES, skillsFor } from '@/lib/data';
import { useLang } from '@/lib/lang';
import { playMusic, sfx } from '@/lib/sound';

/**
 * Panggung pixel art yang hidup selama permainan. Engine (pixelfx) dimuat lazy; event dari server
 * ('stage:events') diputar berurutan. Berhenti menggambar saat tidak terlihat di layar.
 */
export default function StageView({ room, targetId, onPick, lowPower = false, className = '' }) {
  const canvas = useRef(null);
  const stage = useRef(null);
  const buffered = useRef([]);
  const latest = useRef(room);
  const pick = useRef(onPick);
  const { lang } = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;
  latest.current = room;
  pick.current = onPick;

  useEffect(() => {
    let st = null;
    let cancelled = false;
    let io = null;
    import('@/lib/stage/engine').then(({ Stage }) => {
      if (cancelled || !canvas.current) return;
      st = new Stage(canvas.current, { onPick: (id, side) => pick.current?.(id, side), lowPower, lang: langRef.current, sfx });
      stage.current = st;
      window.__lorekeeperStage = st; // untuk debug performa (st.stats)
      const r = latest.current;
      st.setBiome(r.biome);
      st.syncHeroes(r.players);
      st.syncEnemies(r.enemies);
      if (buffered.current.length) st.enqueue(buffered.current.splice(0));
      // muat efek skill party & serangan musuh saat browser senggang
      const ids = r.players.flatMap((p) => (p.character ? skillsFor(p.character).map((s) => s.fx) : []));
      ids.push(...Object.values(ENEMY_TYPES).map((e) => e.attack), 'ui/damage-number', 'spawn/soul-rise', 'spawn/poof', 'impacts/hit-spark');
      st.prefetch(ids);
      if (typeof IntersectionObserver === 'function') {
        io = new IntersectionObserver(([e]) => (st.paused = !e.isIntersecting), { threshold: 0.05 });
        io.observe(canvas.current);
      }
    });
    const s = getSocket();
    const onEvents = ({ events }) => (stage.current ? stage.current.enqueue(events) : buffered.current.push(...events));
    s.on('stage:events', onEvents);
    return () => {
      cancelled = true;
      io?.disconnect();
      s.off('stage:events', onEvents);
      st?.destroy();
      stage.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    st.syncHeroes(room.players);
    st.syncEnemies(room.enemies);
    if (!st.running) st.setBiome(room.biome);
  }, [room.players, room.enemies, room.biome]);

  // musik mengikuti biome; berubah jadi tema tempur saat ada musuh
  const fighting = room.inCombat && room.enemies.some((e) => e.hp > 0);
  useEffect(() => {
    playMusic(fighting ? 'combat' : room.biome);
  }, [fighting, room.biome]);

  useEffect(() => {
    if (stage.current) stage.current.highlight = targetId || null;
  }, [targetId]);

  useEffect(() => {
    stage.current?.setLowPower(lowPower);
  }, [lowPower]);

  useEffect(() => {
    if (stage.current) stage.current.lang = lang;
  }, [lang]);

  return (
    <canvas
      ref={canvas}
      width={320}
      height={180}
      className={`block h-full w-full cursor-crosshair bg-coal ${className}`}
      style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      aria-label="stage"
    />
  );
}

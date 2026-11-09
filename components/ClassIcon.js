'use client';
import { useEffect, useRef } from 'react';
import { Crosshair, Music, Shield, Sun, VenetianMask, WandSparkles } from 'lucide-react';
import { CLASSES } from '@/lib/data';

const ICONS = { fighter: Shield, rogue: VenetianMask, wizard: WandSparkles, cleric: Sun, ranger: Crosshair, bard: Music };

export default function ClassIcon({ classId, size = 18, className = '' }) {
  const Icon = ICONS[classId] || Shield;
  return <Icon size={size} className={className} style={{ color: CLASSES[classId]?.color }} strokeWidth={1.75} />;
}

/** Potret pixel art karakter (pose diam), digambar dengan rig pixelfx. */
export function Portrait({ look, height = 46, className = '' }) {
  const ref = useRef(null);
  const key = JSON.stringify(look || {});
  useEffect(() => {
    let alive = true;
    if (!look) return;
    import('@/lib/stage/engine').then((m) => alive && ref.current && m.drawPortrait(ref.current, look));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return <canvas ref={ref} width={36} height={46} className={className} style={{ height, width: (height * 36) / 46, imageRendering: 'pixelated' }} />;
}

export function Sigil({ character, size = 44 }) {
  const cls = CLASSES[character.classId];
  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 30%, ${cls.color}40, #15110e 72%)`,
        boxShadow: `inset 0 0 0 1.5px ${cls.color}88`,
      }}
    >
      {character.look ? (
        <Portrait look={character.look} height={size * 1.15} className="translate-y-[12%]" />
      ) : (
        <ClassIcon classId={character.classId} size={size * 0.45} />
      )}
    </div>
  );
}

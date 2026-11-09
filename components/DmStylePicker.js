'use client';
import { Bot, Compass, Crown, Ghost, Laugh, Leaf, Scale, Search, Skull, UserRound, Users } from 'lucide-react';
import { emit } from '@/lib/client';
import { useLang } from '@/lib/lang';

// urutan = urutan tampil; id disimpan di room.settings.dmStyle
export const DM_STYLE_LIST = [
  ['seimbang', Scale],
  ['kocak', Laugh],
  ['petualang', Compass],
  ['epik', Crown],
  ['serius', Skull],
  ['horor', Ghost],
  ['misteri', Search],
  ['santai', Leaf],
];

/** Pilih kepribadian Dungeon Master. Hanya host yang bisa mengubah; berlaku mulai narasi berikutnya. */
export default function DmStylePicker({ room, isHost, compact = false }) {
  const { T } = useLang();
  const cur = room.settings.dmStyle || 'kocak';
  return (
    <div className={compact ? '' : 'mt-4'}>
      <p className="text-sm text-parch-dim">{T('dmStyle.label')}</p>
      <div className={`mt-1.5 grid gap-1.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {DM_STYLE_LIST.map(([s, Icon]) => (
          <button
            key={s}
            type="button"
            disabled={!isHost}
            aria-pressed={cur === s}
            onClick={() => emit('room:settings', { dmStyle: s })}
            title={T(`dmStyle.${s}Tip`)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs disabled:cursor-default ${cur === s ? 'border-ember bg-ember/10 text-ember' : 'border-gold/15 text-parch-dim enabled:hover:border-gold/40 enabled:hover:text-parch'}`}
          >
            <Icon size={14} className="shrink-0" /> <span className="truncate">{T(`dmStyle.${s}`)}</span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs leading-snug text-parch-dim">{T(`dmStyle.${cur}Tip`)}</p>
    </div>
  );
}

const MODES = [
  ['ai', Bot],
  ['human', UserRound],
  ['assist', Users],
];

/** Siapa Dungeon Master-nya: AI (Nemotron), manusia, atau manusia dibantu draf AI. */
export function DmModePicker({ room, isHost, compact = false }) {
  const { T } = useLang();
  const cur = room.settings.dmMode || 'ai';
  const dm = room.players.find((p) => p.id === room.dmId);
  return (
    <div className={compact ? '' : 'mt-4'}>
      <p className="text-sm text-parch-dim">{T('dmMode.label')}</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {MODES.map(([m, Icon]) => (
          <button
            key={m}
            type="button"
            disabled={!isHost}
            aria-pressed={cur === m}
            onClick={() => emit('room:settings', { dmMode: m })}
            title={T(`dmMode.${m}Tip`)}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs disabled:cursor-default ${cur === m ? 'border-ember bg-ember/10 text-ember' : 'border-gold/15 text-parch-dim enabled:hover:border-gold/40 enabled:hover:text-parch'}`}
          >
            <Icon size={14} className="shrink-0" /> <span className="truncate">{T(`dmMode.${m}`)}</span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs leading-snug text-parch-dim">
        {T(`dmMode.${cur}Tip`)}
        {dm && (
          <>
            {' '}
            <b className="text-parch">{T('dmMode.seat', { name: dm.name })}</b>
          </>
        )}
      </p>
    </div>
  );
}

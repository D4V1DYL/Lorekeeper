'use client';
import { Crown, UserX } from 'lucide-react';
import { emit } from '@/lib/client';
import { useLang } from '@/lib/lang';

/** Tombol host untuk pemain lain: jadikan host / keluarkan. */
export default function HostControls({ room, me, player, className = '' }) {
  const { T } = useLang();
  if (room.hostId !== me.id || player.id === me.id) return null;
  const name = player.character?.name || player.name;
  return (
    <span className={`flex shrink-0 items-center gap-1 ${className}`}>
      <button
        type="button"
        title={T('host.make')}
        aria-label={T('host.make')}
        onClick={(e) => {
          e.stopPropagation();
          emit('host:transfer', { to: player.id });
        }}
        className="rounded-full border border-gold/25 p-1.5 text-gold hover:bg-gold/10"
      >
        <Crown size={12} />
      </button>
      <button
        type="button"
        title={T('host.kick')}
        aria-label={T('host.kick')}
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(T('host.kickConfirm', { name }))) emit('player:kick', { id: player.id });
        }}
        className="rounded-full border border-blood/30 p-1.5 text-blood hover:bg-blood/10"
      >
        <UserX size={12} />
      </button>
    </span>
  );
}

'use client';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Backpack, Coins, FlaskConical, Gem, Shield, Store, Sword, X } from 'lucide-react';
import { ITEMS, SHOP_STOCK, gearBonus } from '@/lib/data';
import { emit } from '@/lib/client';
import { useLang } from '@/lib/lang';
import { sfx } from '@/lib/sound';

const ICON = { potion: FlaskConical, armor: Shield, trinket: Gem, relic: Sword };

export default function ShopPanel({ room, me, onClose }) {
  const { T, D } = useLang();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(null);
  const c = me.character;
  const inv = (c?.inv || []).filter((x) => x.qty > 0);
  const owns = (id) => inv.some((x) => x.id === id);
  const locked = room.inCombat && room.enemies.some((e) => e.hp > 0);
  const dead = !!c?.death?.dead;
  const b = gearBonus(c);
  const bonusText = [b.ac && `+${b.ac} AC`, b.atk && `+${b.atk} ATK`, b.dmg && `+${b.dmg} DMG`, b.hp && `+${b.hp} HP`].filter(Boolean).join(' · ') || '—';

  async function buy(id) {
    setMsg('');
    setBusy(id);
    const res = await emit('shop:buy', { item: id });
    setBusy(null);
    if (!res.ok) {
      sfx('fail');
      return setMsg(res.error);
    }
    sfx('coin');
  }

  return (
    <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="panel scroll-thin max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <Store className="text-gold" size={22} />
          <h2 className="font-display text-xl font-bold text-gold">{T('shop.title')}</h2>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-gold/10 px-3 py-1 text-sm text-gold">
            <Coins size={14} /> {c?.gold ?? 0}
          </span>
          <button onClick={onClose} className="rounded-full p-1.5 text-parch-dim hover:text-parch" aria-label={T('common.close')}>
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs text-parch-dim">{T('shop.sub')}</p>
        {locked && <p className="mt-3 rounded-lg border border-blood/30 bg-blood/10 px-3 py-2 text-sm text-blood">{T('shop.locked')}</p>}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SHOP_STOCK.map((id) => {
            const I = ITEMS[id];
            const Icon = ICON[I.type] || Gem;
            const have = I.type !== 'potion' && owns(id);
            const qty = I.type === 'potion' ? inv.find((x) => x.id === id)?.qty || 0 : 0;
            const poor = (c?.gold ?? 0) < I.price;
            return (
              <div key={id} className={`flex items-start gap-3 rounded-xl border p-3 ${have ? 'border-moss/30 bg-moss/5' : 'border-gold/10 bg-ink/50'}`}>
                <Icon size={18} className="mt-0.5 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold">
                    {D.itemName(id, I.name)} {qty > 0 && <span className="text-xs font-normal text-parch-dim">×{qty}</span>}
                  </p>
                  <p className="text-xs text-parch-dim">{D.itemDesc(id, I.desc)}</p>
                </div>
                {have ? (
                  <span className="shrink-0 self-center text-xs text-moss">{T('shop.owned')}</span>
                ) : (
                  <button
                    disabled={locked || dead || poor || busy === id}
                    onClick={() => buy(id)}
                    className="shrink-0 self-center rounded-lg bg-gradient-to-b from-ember to-[#c4621f] px-3 py-1.5 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {T('shop.buy', { n: I.price })}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {msg && <p className="mt-3 text-sm text-blood">{msg}</p>}

        <div className="rune-divider my-5" />
        <h3 className="flex items-center gap-2 font-display text-sm font-bold tracking-widest text-parch-dim uppercase">
          <Backpack size={15} /> {T('shop.inv', { name: c?.name || me.name })}
        </h3>
        {inv.length === 0 && (c?.items || []).length === 0 ? (
          <p className="mt-2 text-sm text-parch-dim">{T('shop.empty')}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {inv.map((x) => (
              <li key={x.id} title={D.itemDesc(x.id, ITEMS[x.id]?.desc || '')} className={`rounded-full border px-2.5 py-1 text-xs ${ITEMS[x.id]?.type === 'relic' || !ITEMS[x.id]?.price ? 'border-gold/50 text-gold' : 'border-gold/15 text-parch'}`}>
                {D.itemName(x.id, ITEMS[x.id]?.name || x.id)}
                {x.qty > 1 && ` ×${x.qty}`}
              </li>
            ))}
            {(c?.items || []).map((i) => (
              <li key={i} className="rounded-full border border-gold/10 px-2.5 py-1 text-xs text-parch-dim">
                {D.item(i)}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-gold">{T('shop.bonus', { b: bonusText })}</p>
      </motion.div>
    </motion.div>
  );
}

// Mekanik tempur (server-authoritative): lemparan serangan vs AC, dadu damage, kritis, status, giliran musuh, XP & loot.
// DM (Nemotron) menerima ringkasan hasil ini dan menceritakannya; angka tidak bergantung pada AI.

import { randomInt } from 'node:crypto';
import { BOSS_DROP, CLASSES, ENEMY_TYPES, ITEMS, MAX_LEVEL, PROFICIENCY, QUESTS, effectiveAC, gearBonus, levelForXp, mod, skillsFor } from './data.js';
import { dataT, isPotion, t } from './i18n.js';

const M = (room, key, vars) => t(room.settings?.language, key, vars);

const die = (n) => randomInt(1, n + 1);

/** "2d6+3" → { total, dice }. crit: jumlah dadu dua kali lipat. */
export function rollExpr(expr, crit = false) {
  const m = String(expr || '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) return { total: 0, dice: [] };
  const n = Number(m[1]) * (crit ? 2 : 1);
  const dice = Array.from({ length: n }, () => die(Number(m[2])));
  return { total: dice.reduce((a, b) => a + b, 0) + Number(m[3] || 0), dice };
}

function d20(adv = false) {
  const a = die(20);
  if (!adv) return { nat: a, rolls: [a] };
  const b = die(20);
  return { nat: Math.max(a, b), rolls: [a, b] };
}

const enemyStats = (e) => ENEMY_TYPES[e.type] || ENEMY_TYPES.bandit;
const alive = (list) => list.filter((e) => e.hp > 0);
const st = (o) => (o.status ??= {});

/** Pastikan field progresi ada (untuk karakter lama). */
export function ensureProgress(c) {
  c.xp ??= 0;
  c.gold ??= 10;
  c.level ??= 1;
  c.cooldowns ??= {};
  c.status ??= {};
  c.inv ??= [];
  // karakter lama: pindahkan ramuan dari daftar teks ke inventaris
  const legacy = (c.items || []).filter((i) => isPotion(i)).length;
  if (legacy) {
    c.items = c.items.filter((i) => !isPotion(i));
    addItem(c, 'potion', legacy);
  }
  return c;
}

/** Tambah item katalog ke inventaris (bonus HP maksimal langsung diterapkan). */
export function addItem(c, id, qty = 1) {
  const I = ITEMS[id];
  if (!I) return false;
  c.inv ??= [];
  const slot = c.inv.find((x) => x.id === id);
  const isNew = !slot || !slot.qty;
  if (slot) slot.qty += qty;
  else c.inv.push({ id, qty });
  if (I.bonus?.hp && isNew) {
    c.maxHp += I.bonus.hp;
    if (c.hp > 0) c.hp += I.bonus.hp;
  }
  return true;
}

/** Karakter jatuh ke 0 HP: mulai death saving throw. */
export function markDown(c) {
  if (c.hp <= 0 && !c.death) c.death = { s: 0, f: 0 };
}
export function clearDown(c) {
  if (c.hp > 0) delete c.death;
}

/** Turunkan cooldown semua karakter satu ronde. */
export function tickCooldowns(room) {
  for (const p of room.players) {
    const c = p.character;
    if (!c?.cooldowns) continue;
    for (const k of Object.keys(c.cooldowns)) if (--c.cooldowns[k] <= 0) delete c.cooldowns[k];
  }
}

/** Beri XP ke semua karakter; kembalikan event naik level. */
export function grantXp(room, amount, notes) {
  const events = [];
  if (!amount) return events;
  for (const p of room.players) {
    const c = p.character;
    if (!c) continue;
    ensureProgress(c);
    c.xp += amount;
    while (c.level < MAX_LEVEL && levelForXp(c.xp) > c.level) {
      c.level += 1;
      const gain = Math.max(2, Math.floor(CLASSES[c.classId].hitDie / 2) + 1 + mod(c.stats.CON));
      c.maxHp += gain;
      c.hp = Math.min(c.maxHp, c.hp + gain);
      notes.push(M(room, 'cmb.levelUp', { name: c.name, lv: c.level, n: gain }));
      events.push({ kind: 'levelup', target: p.id, level: c.level, hp: c.hp });
    }
  }
  return events;
}

const rand = (arr) => arr[randomInt(arr.length)];
const itemName = (room, id) => dataT(room.settings?.language).itemName(id, ITEMS[id]?.name || id);

/** Jarahan & progres misi saat musuh kalah (oleh mekanik maupun DM). */
function afterDefeat(room, enemy, killer, notes, events) {
  const heroes = room.players.filter((p) => p.character && !p.character.death?.dead);
  const finder = killer?.character ? killer : heroes.length ? rand(heroes) : null;
  if (finder) {
    let drop = null;
    if (enemy.boss && BOSS_DROP[room.area]) drop = BOSS_DROP[room.area];
    else if (randomInt(100) < 12) drop = randomInt(100) < 25 ? 'potion_big' : 'potion';
    if (drop && addItem(finder.character, drop)) {
      notes.push(M(room, 'cmb.loot', { name: finder.character.name, item: itemName(room, drop) }));
      events.push({ kind: 'item', target: finder.id, item: drop, rare: !!enemy.boss });
    }
  }
  room.quests ??= {};
  for (const q of QUESTS) {
    if (q.area !== room.area || !q.types.includes(enemy.type)) continue;
    const qs = (room.quests[q.id] ??= { n: 0, done: false });
    if (qs.done) continue;
    qs.n += 1;
    const title = dataT(room.settings?.language).questTitle(q.id, q.title);
    if (qs.n < q.count) {
      notes.push(M(room, 'cmb.questProg', { q: title, n: qs.n, m: q.count }));
      continue;
    }
    qs.done = true;
    for (const p of room.players) if (p.character) p.character.gold = (p.character.gold ?? 0) + q.reward.gold;
    const who = finder || heroes[0];
    if (who && q.reward.item) addItem(who.character, q.reward.item);
    notes.push(M(room, 'cmb.questDone', { q: title, xp: q.reward.xp, gold: q.reward.gold, name: who?.character?.name || '-', item: itemName(room, q.reward.item) }));
    events.push({ kind: 'quest', target: who?.id, quest: q.id });
    events.push(...grantXp(room, q.reward.xp, notes));
  }
}

function kill(room, enemy, killer, notes, events) {
  const s = { ...enemyStats(enemy), xp: enemy.xp ?? enemyStats(enemy).xp };
  if (enemy.boss) room.__bossKilled = enemy;
  room.enemies = room.enemies.filter((e) => e.id !== enemy.id);
  events.push({ kind: 'die', target: enemy.id });
  const gold = Math.round(s.xp / 2 + die(Math.max(2, Math.round(s.xp / 2))));
  if (killer?.character) {
    killer.character.gold = (killer.character.gold ?? 0) + gold;
    events.push({ kind: 'loot', target: enemy.id, to: killer.id, gold });
  }
  notes.push(killer?.character ? M(room, 'cmb.killLoot', { enemy: enemy.name, xp: s.xp, name: killer.character.name, gold }) : M(room, 'cmb.kill', { enemy: enemy.name, xp: s.xp }));
  events.push(...grantXp(room, s.xp, notes));
  afterDefeat(room, enemy, killer, notes, events);
}

/** Kematian musuh yang diputuskan DM (lewat daftar enemies). */
export function rewardKill(room, enemy, notes, events) {
  const s = { ...enemyStats(enemy), xp: enemy.xp ?? enemyStats(enemy).xp };
  notes.push(M(room, 'cmb.kill', { enemy: enemy.name, xp: s.xp }));
  events.push(...grantXp(room, s.xp, notes));
  afterDefeat(room, enemy, null, notes, events);
}

/**
 * Selesaikan satu aksi ber-skill. Mengembalikan { event, notes, offensive }.
 * event: untuk panggung (berisi hasil per target), notes: kalimat untuk log & DM.
 */
export function resolveSkill(room, player, action) {
  const c = ensureProgress(player.character);
  const skill = skillsFor(c).find((s) => s.id === action.skill);
  const notes = [];
  const extra = [];
  if (!skill) return { event: null, notes, extra, offensive: false };
  const sn = dataT(room.settings?.language).skillName(skill);
  const m = skill.noMod ? 0 : mod(c.stats[skill.stat] ?? 10);
  const gear = gearBonus(c);
  const atk = m + PROFICIENCY + (c.level >= 5 ? 1 : 0) + gear.atk;
  const results = [];
  let primary = action.target || null;
  let offensive = false;

  let healExpr = skill.heal;
  if (skill.id === 'potion') {
    // pakai ramuan agung bila luka besar, selain itu ramuan biasa
    const big = c.inv.find((x) => x.id === 'potion_big' && x.qty > 0);
    const small = c.inv.find((x) => x.id === 'potion' && x.qty > 0);
    const use = big && (!small || c.maxHp - c.hp >= 10) ? big : small || big;
    if (use) {
      use.qty -= 1;
      healExpr = ITEMS[use.id].heal;
      c.inv = c.inv.filter((x) => x.qty > 0);
    } else {
      const i = c.items.findIndex((x) => isPotion(x));
      if (i !== -1) c.items.splice(i, 1);
    }
  }

  if (skill.cd) c.cooldowns[skill.id] = skill.cd;

  const isHeal = !!skill.heal;
  const isAllySupport = skill.ally || skill.mode === 'self';

  if (isHeal) {
    const targets = skill.all ? room.players.filter((p) => p.character) : [room.players.find((p) => p.id === primary && p.character) || player];
    primary = targets[0]?.id;
    for (const t of targets) {
      const tc = t.character;
      if (tc.death?.dead) {
        notes.push(M(room, 'cmb.deadNoHeal', { target: tc.name }));
        continue;
      }
      const amount = Math.max(1, rollExpr(healExpr).total + m);
      const before = tc.hp;
      tc.hp = Math.min(tc.maxHp, tc.hp + amount);
      clearDown(tc);
      results.push({ target: t.id, heal: true, amount: tc.hp - before, hp: tc.hp });
      notes.push(M(room, before === 0 ? 'cmb.revive' : 'cmb.heal', { name: c.name, skill: sn, target: tc.name, n: tc.hp - before, hp: tc.hp, max: tc.maxHp }));
    }
  } else if (skill.status === 'shield') {
    const t = room.players.find((p) => p.id === primary && p.character) || player;
    primary = t.id;
    st(t.character).shield = 2;
    results.push({ target: t.id, status: 'shield' });
    notes.push(M(room, 'cmb.shield', { name: c.name, skill: sn, target: t.character.name }));
  } else if (skill.status === 'hidden') {
    st(c).hidden = 2;
    primary = player.id;
    results.push({ target: player.id, status: 'hidden' });
    notes.push(M(room, 'cmb.hidden', { name: c.name, skill: sn }));
  } else if (!isAllySupport) {
    offensive = true;
    const foes = alive(room.enemies);
    if (!foes.length) {
      notes.push(M(room, 'cmb.noFoe', { name: c.name, skill: sn }));
    } else {
      const first = foes.find((e) => e.id === primary) || foes[0];
      primary = first.id;
      const targets = [first, ...foes.filter((e) => e !== first)].slice(0, skill.aoe || 1);
      const hidden = st(c).hidden > 0;
      for (const [k, t] of targets.entries()) {
        const s = enemyStats(t);
        const ac = s.ac;
        const reps = k === 0 ? skill.hits || 1 : 1;
        let dmg = 0;
        let hit = false;
        let crit = false;
        let nat = null;
        let total = null;
        for (let i = 0; i < reps; i++) {
          let h, cr;
          if (skill.auto) {
            h = true;
            cr = false;
          } else {
            const r = d20(skill.adv || hidden);
            nat = r.nat;
            total = r.nat + atk;
            cr = r.nat === 20;
            h = cr || (r.nat !== 1 && total >= ac);
          }
          if (!h) continue;
          hit = true;
          crit = crit || cr;
          if (skill.dmg) dmg += Math.max(1, rollExpr(skill.dmg, cr).total + (skill.hits ? 0 : m) + gear.dmg);
          if (skill.sneak && hidden) dmg += rollExpr(skill.sneak, cr).total;
        }
        if (hit && skill.status && t.hp - dmg > 0) st(t)[skill.status] = 1;
        const before = t.hp;
        t.hp = Math.max(0, t.hp - dmg);
        results.push({ target: t.id, hit, crit, miss: !hit, amount: before - t.hp, hp: t.hp, status: hit ? skill.status : undefined });
        const rollTxt = skill.auto ? M(room, 'cmb.auto') : `d20 ${nat}${atk >= 0 ? '+' : ''}${atk} = ${total} vs AC ${ac}`;
        const statusTxt = hit && skill.status && t.hp > 0 ? M(room, skill.status === 'stun' ? 'cmb.stunned' : 'cmb.weakened', { target: t.name }) : '';
        const result = hit ? M(room, 'cmb.hit', { crit: crit ? M(room, 'cmb.critTag') : '', n: before - t.hp, hp: t.hp, max: t.maxHp, status: statusTxt }) : M(room, 'cmb.miss');
        notes.push(M(room, 'cmb.attack', { name: c.name, skill: sn, target: t.name, roll: rollTxt, result }));
        if (t.hp <= 0) kill(room, t, player, notes, extra);
      }
      if (hidden) st(c).hidden = 0;
    }
  }

  const event = { kind: 'skill', actor: player.id, skill: skill.id, target: primary, results };
  return { event, notes, extra, offensive };
}

/** Giliran musuh: tiap musuh yang bisa bergerak menyerang satu pahlawan. */
export function enemyTurn(room) {
  const events = [];
  const notes = [];
  for (const e of alive(room.enemies)) {
    const s = enemyStats(e);
    const es = st(e);
    if (es.stun > 0) {
      es.stun -= 1;
      notes.push(M(room, 'cmb.enemyStun', { name: e.name }));
      events.push({ kind: 'stunned', target: e.id });
      continue;
    }
    const heroes = room.players.filter((p) => p.character && p.character.hp > 0 && !(p.character.status?.hidden > 0));
    if (!heroes.length) break;
    const p = heroes[randomInt(heroes.length)];
    const c = p.character;
    const r = d20();
    const crit = r.nat === 20;
    const AC = effectiveAC(c);
    const hit = crit || (r.nat !== 1 && r.nat + s.atk >= AC);
    if (!hit) {
      events.push({ kind: 'hurt', target: p.id, by: e.id, miss: true, amount: 0, hp: c.hp });
      notes.push(M(room, 'cmb.enemyMiss', { enemy: e.name, name: c.name, roll: `${r.nat}+${s.atk}`, ac: AC }));
    } else {
      let dmg = Math.max(1, rollExpr(s.dmg, crit).total);
      const tags = [];
      if (es.weak > 0) {
        dmg = Math.max(1, Math.floor(dmg / 2));
        tags.push(M(room, 'cmb.tagWeak'));
      }
      if (c.status?.shield > 0) {
        dmg = Math.max(1, Math.floor(dmg / 2));
        tags.push(M(room, 'cmb.tagShield'));
      }
      const before = c.hp;
      c.hp = Math.max(0, c.hp - dmg);
      events.push({ kind: 'hurt', target: p.id, by: e.id, crit, amount: before - c.hp, hp: c.hp });
      notes.push(M(room, 'cmb.enemyHit', { enemy: e.name, name: c.name, crit: crit ? M(room, 'cmb.critTag') : '', n: before - c.hp, tags: tags.length ? ` (${tags.join(', ')})` : '', hp: c.hp, max: c.maxHp }));
      if (c.hp === 0) {
        markDown(c);
        events.push({ kind: 'down', target: p.id });
        notes.push(M(room, 'cmb.down', { name: c.name }));
      }
    }
    if (es.weak > 0) es.weak -= 1;
  }
  // status pahlawan berkurang setelah giliran musuh
  for (const p of room.players) {
    const s2 = p.character?.status;
    if (!s2) continue;
    for (const k of Object.keys(s2)) if (--s2[k] <= 0) delete s2[k];
  }
  return { events, notes };
}

/**
 * Death saving throw otomatis di akhir ronde untuk setiap karakter yang tumbang (aturan D&D 5e):
 * d20 ≥ 10 berhasil, < 10 gagal, natural 1 = dua gagal, natural 20 = bangkit dengan 1 HP.
 * 3 berhasil = stabil, 3 gagal = gugur (bangkit lagi saat party beristirahat).
 */
export function deathSaves(room) {
  const events = [];
  const notes = [];
  if (!room.players.some((p) => p.character && p.character.hp > 0)) return { events, notes };
  for (const p of room.players) {
    const c = p.character;
    if (!c || c.hp > 0) continue;
    markDown(c);
    const D = c.death;
    if (D.stable || D.dead) continue;
    const d = die(20);
    let res;
    if (d === 20) {
      c.hp = 1;
      delete c.death;
      res = 'revive';
      notes.push(M(room, 'cmb.deathNat20', { name: c.name }));
    } else {
      if (d === 1) D.f += 2;
      else if (d >= 10) D.s += 1;
      else D.f += 1;
      notes.push(M(room, d >= 10 ? 'cmb.deathOk' : 'cmb.deathFail', { name: c.name, d, s: Math.min(3, D.s), f: Math.min(3, D.f) }));
      if (D.f >= 3) {
        D.dead = true;
        res = 'dead';
        notes.push(M(room, 'cmb.dead', { name: c.name }));
      } else if (D.s >= 3) {
        D.stable = true;
        res = 'stable';
        notes.push(M(room, 'cmb.stable', { name: c.name }));
      } else res = d >= 10 ? 'ok' : 'fail';
    }
    events.push({ kind: 'deathsave', target: p.id, d20: d, result: res, s: c.death?.s ?? 0, f: c.death?.f ?? 0, hp: c.hp });
  }
  return { events, notes };
}

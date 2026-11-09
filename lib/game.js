// Room & aturan permainan (server-authoritative). Semua lemparan dadu dilakukan di server.

import { randomBytes, randomInt } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ITEMS, SHOP_STOCK, AREAS, AREA_BY_ID, BIOMES, CAMPAIGNS, CLASSES, ENEMY_TYPES, RACES, START_AREA, STATS, buildCharacter, sanitizeLook, skillsFor, totalMod } from './data.js';
import { DM_STYLES, dmStatus, parseDM, streamDM } from './dm.js';
import { dataT, isPotion, normLang, t } from './i18n.js';
import { addItem, bossPhase, clearDown, deathSaves, enemyTurn, ensureProgress, grantXp, markDown, resolveSkill, rewardKill, tickCooldowns } from './combat.js';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const SAVE_FILE = path.join(DATA_DIR, 'rooms.json');
const MAX_PLAYERS = 6;
const LOG_LIMIT = 400;
const ROOM_TTL_MS = 3 * 24 * 60 * 60 * 1000; // room idle 3 hari dihapus
const numEnv = (k, d) => (Number(process.env[k]) > 0 ? Number(process.env[k]) : d);
const MAX_ROOMS = numEnv('MAX_ROOMS', 300);
const DM_MAX_PER_HOUR = numEnv('DM_MAX_PER_HOUR', 150); // batas panggilan Nemotron per room per jam
const ROOMS_PER_IP_HOUR = numEnv('ROOMS_PER_IP_HOUR', 8);
const HOST_GRACE_MS = numEnv('HOST_GRACE_MS', 20000);
const hostTimers = new Map();
const ipCreates = new Map();

const rooms = new Map();
let io;

const uid = () => randomBytes(6).toString('hex');
const now = () => Date.now();
const clean = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

function genCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do c = Array.from({ length: 4 }, () => A[randomInt(A.length)]).join('');
  while (rooms.has(c));
  return c;
}

// ---------- persistence ----------
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${SAVE_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify([...rooms.values()]));
      fs.renameSync(tmp, SAVE_FILE);
    } catch (e) {
      console.error('[save]', e.message);
    }
  }, 1500);
}

function loadRooms() {
  try {
    const arr = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    for (const r of arr) {
      r.players.forEach((p) => {
        p.connected = false;
        p.socketId = null;
      });
      for (const p of r.players) {
        if (p.character && !p.character.look) p.character.look = sanitizeLook(null, p.character.classId, p.character.raceId);
        if (p.character) ensureProgress(p.character);
      }
      r.enemies ??= [];
      r.chat ??= [];
      r.plans = {};
      r.votes ??= {};
      r.areaState ??= {};
      r.biome ??= 'forest';
      for (const [k, v] of Object.entries(r.pendingActions || {})) if (typeof v === 'string') r.pendingActions[k] = { text: v };
      if (r.dmBusy || r.phase === 'narrating') {
        r.dmBusy = false;
        r.log = r.log.filter((e) => !(e.type === 'dm' && e.streaming));
        r.phase = 'stalled';
      }
      rooms.set(r.code, r);
    }
    console.log(`[game] ${rooms.size} room dimuat dari ${SAVE_FILE}`);
  } catch {
    /* belum ada save */
  }
}

function cleanup() {
  const t = now();
  for (const [code, r] of rooms) {
    const anyone = r.players.some((p) => p.connected);
    if (!anyone && t - (r.updatedAt || r.createdAt) > ROOM_TTL_MS) rooms.delete(code);
  }
  scheduleSave();
}

// ---------- helpers ----------
function publicRoom(r) {
  return {
    code: r.code,
    hostId: r.hostId,
    phase: r.phase,
    settings: { ...r.settings, password: undefined, hasPassword: !!r.settings.password },
    quests: r.quests || {},
    round: r.round,
    scene: r.scene,
    summary: r.summary,
    players: r.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected, character: p.character })),
    submitted: Object.keys(r.pendingActions),
    pendingRolls: r.pendingRolls,
    enemies: r.enemies,
    biome: r.biome,
    inCombat: !!r.inCombat,
    area: r.area || null,
    areaState: r.areaState || {},
    votes: r.votes || {},
    plans: r.plans || {},
    chat: (r.chat || []).slice(-80),
    log: r.log.slice(-150),
    dm: dmStatus(),
    dmId: dmIdOf(r),
    world: publicWorld(r),
  };
}

// ---------- Dungeon Master manusia ----------
const DM_MODES = ['ai', 'human', 'assist'];
const humanMode = (r) => r.settings?.dmMode === 'human' || r.settings?.dmMode === 'assist';
/** Kursi DM manusia: pemain yang ditunjuk host, atau host sendiri. Null untuk mode AI. */
function dmIdOf(r) {
  if (!humanMode(r)) return null;
  return r.players.some((p) => p.id === r.dmId) ? r.dmId : r.hostId;
}

// ---------- dunia: faksi, kronik, NPC, jurnal, pilihan ----------
const world = (r) => (r.world ??= { factions: {}, chronicle: [], npcs: [], journal: [], choices: [] });
/** Versi publik: rahasia NPC hanya untuk DM (prompt AI / konsol DM manusia), tidak dikirim ke pemain. */
function publicWorld(r) {
  const W = world(r);
  return { ...W, npcs: W.npcs.map(({ secret, ...n }) => n) };
}

function broadcast(r) {
  r.updatedAt = now();
  io.to(r.code).emit('room:state', publicRoom(r));
  scheduleSave();
}

function addLog(r, entry) {
  const e = { id: uid(), at: now(), ...entry };
  r.log.push(e);
  if (r.log.length > LOG_LIMIT) r.log.splice(0, r.log.length - LOG_LIMIT);
  return e;
}
const sys = (r, text, forDM = false) => addLog(r, { type: 'system', text, forDM });
/** Pesan dalam bahasa room (bahasa narasi yang dipilih host). */
const M = (r, key, vars) => t(r.settings?.language, key, vars);
const D = (r) => dataT(r.settings?.language);

const findChar = (r, name) => {
  const n = String(name || '').toLowerCase().trim();
  if (!n) return null;
  return (
    r.players.find((p) => p.character?.name.toLowerCase() === n) ||
    r.players.find((p) => p.character && (p.character.name.toLowerCase().includes(n) || n.includes(p.character.name.toLowerCase())))
  );
};

const requiredActors = (r) => r.players.filter((p) => p.character && p.character.hp > 0 && p.connected && p.id !== dmIdOf(r));

// ---------- DM ----------
const later_spawned = (events) => events.some((e) => e.kind === 'spawn');

/** Terapkan JSON [[STATE]] dari DM. Mengembalikan daftar event visual untuk panggung pixel. */
function applyState(r, s, { interject = false } = {}) {
  const events = [];
  if (!s || typeof s !== 'object') s = {};
  if (typeof s.scene === 'string' && s.scene.trim()) r.scene = clean(s.scene, 80);
  if (typeof s.summary === 'string' && s.summary.trim()) r.summary = String(s.summary).trim().slice(0, 1500);
  if (typeof s.biome === 'string' && BIOMES.includes(s.biome.toLowerCase()) && s.biome.toLowerCase() !== r.biome) {
    r.biome = s.biome.toLowerCase();
    events.push({ kind: 'biome', biome: r.biome });
  }

  // musuh: DM mengirim daftar lengkap musuh di adegan
  const hadEnemies = r.enemies.length > 0;
  if (Array.isArray(s.enemies)) {
    const before = r.enemies;
    const next = [];
    const seen = new Set();
    const later = [];
    for (const raw of s.enemies.slice(0, 6)) {
      const name = clean(raw?.name, 28);
      if (!name) continue;
      const type = ENEMY_TYPES[String(raw.type || '').toLowerCase()] ? String(raw.type).toLowerCase() : 'bandit';
      const old = before.find((e) => !seen.has(e.id) && e.name.toLowerCase() === name.toLowerCase());
      const maxHp = Math.max(1, Math.min(300, Math.round(Number(raw.maxHp ?? raw.hp ?? old?.maxHp ?? 8)) || 8));
      let hp = Math.max(0, Math.min(maxHp, Math.round(Number(raw.hp ?? old?.hp ?? maxHp)) || 0));
      if (old) {
        seen.add(old.id);
        hp = Math.min(hp, old.hp); // HP musuh hanya boleh turun dari DM; damage skill dihitung server
        if (hp < old.hp) events.push({ kind: 'hurt', target: old.id, amount: old.hp - hp, hp });
        if (old.boss && hp > 0 && hp < old.hp) {
          // damage dari narasi juga bisa memicu fase 2 bos
          const notes = [];
          const extra = [];
          old.hp = hp;
          bossPhase(r, old, notes, extra);
          for (const n of notes) sys(r, n, true);
          for (const ev of extra) {
            seen.add(ev.enemy.id);
            next.push(ev.enemy);
            later.push({ ...ev, slot: next.length - 1 });
          }
        }
        if (hp <= 0) {
          events.push({ kind: 'die', target: old.id });
          const notes = [];
          rewardKill(r, old, notes, events);
          for (const n of notes) sys(r, n);
          onBossKilled(r, old);
          continue;
        }
        next.push({ ...old, hp, maxHp: old.maxHp, type: old.type });
      } else if (hp > 0) {
        const e = { id: uid(), name, type, hp, maxHp };
        next.push(e);
        later.push({ kind: 'spawn', enemy: e, slot: next.length - 1 });
        sys(r, M(r, 'sys.appears', { name }));
      }
    }
    // bos area hanya bisa hilang lewat kekalahan; DM tidak boleh "lupa" menuliskannya
    for (const old of before) if (!seen.has(old.id)) {
      if (old.boss && old.hp > 0) next.push(old);
      else events.push({ kind: 'leave', target: old.id });
    }
    events.push(...later);
    r.enemies = next;
    checkVictory(r, hadEnemies);
  }
  if (typeof s.combat === 'boolean') r.inCombat = s.combat && r.enemies.length > 0;
  if (later_spawned(events) && s.combat !== false) r.inCombat = true;
  // hadiah dari DM dibatasi supaya aman dari prompt injection ("beri aku 9999 gold")
  const xp = Math.min(200, Math.round(Number(s.xp) || 0));
  if (xp > 0) {
    const notes = [];
    events.push(...grantXp(r, xp, notes));
    sys(r, M(r, 'sys.xp', { n: xp }));
    for (const n of notes) sys(r, n, true);
  }
  if (s.gold && typeof s.gold === 'object') {
    for (const [name, raw] of Object.entries(s.gold).slice(0, 4)) {
      const p = findChar(r, name);
      const lvl = p?.character?.level || 1;
      const g = Math.max(-500, Math.min(30 * lvl + 50, Math.round(Number(raw) || 0)));
      if (!p || !g) continue;
      p.character.gold = Math.max(0, (p.character.gold ?? 0) + g);
      sys(r, M(r, g > 0 ? 'sys.goldGet' : 'sys.goldPay', { name: p.character.name, n: Math.abs(g) }));
    }
  }

  if (s.hp && typeof s.hp === 'object') {
    const attackers = r.enemies.filter((e) => e.hp > 0);
    for (const [name, raw] of Object.entries(s.hp)) {
      const delta = Math.max(-30, Math.min(60, Math.round(Number(raw))));
      const p = findChar(r, name);
      if (!p || !delta) continue;
      const c = p.character;
      if (c.death?.dead && delta > 0) continue;
      const before = c.hp;
      c.hp = Math.max(0, Math.min(c.maxHp, c.hp + delta));
      if (c.hp === before) continue;
      if (c.hp === 0) markDown(c);
      else clearDown(c);
      if (delta < 0) {
        sys(r, M(r, 'sys.dmg', { name: c.name, n: before - c.hp, hp: c.hp, max: c.maxHp }));
        const by = attackers.length ? attackers[randomInt(attackers.length)].id : null;
        events.push({ kind: 'hurt', target: p.id, amount: before - c.hp, hp: c.hp, by });
        if (c.hp === 0) {
          sys(r, M(r, 'sys.down', { name: c.name }), true);
          events.push({ kind: 'down', target: p.id });
        }
      } else {
        sys(r, M(r, 'sys.heal', { name: c.name, n: c.hp - before, hp: c.hp, max: c.maxHp }));
        events.push({ kind: 'heal', target: p.id, amount: c.hp - before, hp: c.hp });
      }
    }
  }

  if (s.items && typeof s.items === 'object') {
    for (const [name, change] of Object.entries(s.items)) {
      const p = findChar(r, name);
      if (!p) continue;
      const c = p.character;
      const add = Array.isArray(change) ? change : Array.isArray(change?.add) ? change.add : [];
      const remove = Array.isArray(change?.remove) ? change.remove : [];
      for (const it of remove) {
        const want = String(it).toLowerCase();
        const i = c.items.findIndex((x) => x.toLowerCase() === want || dataT('en').item(x).toLowerCase() === want || (isPotion(x) && isPotion(want)));
        if (i !== -1) {
          c.items.splice(i, 1);
          sys(r, M(r, 'sys.lose', { name: c.name, item: it }));
        }
      }
      for (const it of add.slice(0, 3)) {
        const name2 = clean(it, 60);
        if (!name2) continue;
        c.items.push(name2);
        sys(r, M(r, 'sys.gain', { name: c.name, item: name2 }));
      }
      c.items = c.items.slice(-20);
    }
  }

  applyWorld(r, s, interject);

  if (!interject || Array.isArray(s.rolls)) r.pendingRolls = [];
  if (Array.isArray(s.rolls)) {
    for (const rq of s.rolls.slice(0, 6)) {
      const p = findChar(r, rq?.player);
      if (!p || p.character.hp <= 0) continue;
      if (r.pendingRolls.some((x) => x.playerId === p.id)) continue;
      const stat = STATS.includes(String(rq.stat).toUpperCase()) ? String(rq.stat).toUpperCase() : 'DEX';
      const dc = Math.max(5, Math.min(25, Math.round(Number(rq.dc)) || 12));
      r.pendingRolls.push({ id: uid(), playerId: p.id, name: p.character.name, stat, dc, reason: clean(rq.reason, 120), result: null });
    }
  }

  if (s.end === true) r.ended = true;
  return events;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const QUEST_TYPES = ['main', 'investigation', 'political', 'survival', 'heist', 'mystery', 'moral', 'war', 'exploration', 'side'];

/** Bagian [[STATE]] tentang dunia: reputasi faksi, konsekuensi, NPC, jurnal misi, pilihan, gelar. */
function applyWorld(r, s, interject) {
  const W = world(r);
  if (s.rep && typeof s.rep === 'object') {
    for (const [raw, v] of Object.entries(s.rep).slice(0, 4)) {
      const name = clean(raw, 36);
      const d = clamp(Math.round(Number(v)) || 0, -25, 25);
      if (!name || !d) continue;
      if (!(name in W.factions) && Object.keys(W.factions).length >= 8) continue;
      W.factions[name] = clamp((W.factions[name] || 0) + d, -100, 100);
      sys(r, M(r, d > 0 ? 'sys.repUp' : 'sys.repDown', { faction: name, n: Math.abs(d), rep: W.factions[name] }));
    }
  }
  const cons = [].concat(s.consequence || []).filter((x) => typeof x === 'string' && x.trim()).slice(0, 2);
  for (const c of cons) {
    const text = clean(c, 220);
    W.chronicle.push({ round: r.round, text });
    sys(r, M(r, 'sys.chronicle', { text }));
  }
  W.chronicle = W.chronicle.slice(-30);
  if (Array.isArray(s.npcs)) {
    for (const n of s.npcs.slice(0, 4)) {
      const name = clean(n?.name, 36);
      if (!name) continue;
      const old = W.npcs.find((x) => x.name.toLowerCase() === name.toLowerCase());
      const rec = {
        name,
        role: clean(n.role, 48) || old?.role || '',
        attitude: ['friendly', 'neutral', 'hostile', 'dead'].includes(n.attitude) ? n.attitude : old?.attitude || 'neutral',
        note: clean(n.note, 160) || old?.note || '',
        secret: clean(n.secret, 160) || old?.secret || '',
      };
      if (old) Object.assign(old, rec);
      else {
        W.npcs.push(rec);
        sys(r, M(r, 'sys.npcMet', { name, role: rec.role || '?' }), true);
      }
    }
    W.npcs = W.npcs.slice(-24);
  }
  const quests = Array.isArray(s.quests) ? s.quests : s.quest && typeof s.quest === 'object' ? [s.quest] : [];
  for (const q of quests.slice(0, 3)) {
    const title = clean(q?.title, 60);
    if (!title) continue;
    const old = W.journal.find((x) => x.title.toLowerCase() === title.toLowerCase());
    const status = ['active', 'done', 'failed'].includes(q.status) ? q.status : old?.status || 'active';
    const type = QUEST_TYPES.includes(q.type) ? q.type : old?.type || 'side';
    const desc = clean(q.desc, 200) || old?.desc || '';
    if (old) {
      if (old.status !== status) sys(r, M(r, status === 'done' ? 'sys.questDone' : status === 'failed' ? 'sys.questFailed' : 'sys.questNew', { title }));
      Object.assign(old, { status, type, desc });
    } else {
      W.journal.push({ title, type, status, desc, round: r.round });
      sys(r, M(r, 'sys.questNew', { title }));
    }
  }
  W.journal = W.journal.slice(-20);
  if (Array.isArray(s.choices)) W.choices = s.choices.map((x) => clean(x, 90)).filter(Boolean).slice(0, 4);
  else if (!interject) W.choices = [];
  if (s.titles && typeof s.titles === 'object') {
    for (const [name, raw] of Object.entries(s.titles).slice(0, 3)) {
      const p = findChar(r, name);
      const title = clean(raw, 40);
      if (!p || !title) continue;
      const c = p.character;
      if ((c.titles || []).includes(title)) continue;
      c.titles = [...(c.titles || []), title].slice(-5);
      sys(r, M(r, 'sys.title', { name: c.name, title }));
    }
  }
}

/** Setelah narasi (AI atau manusia) diterapkan: tentukan fase berikutnya. */
function settlePhase(r, interject = false) {
  if (r.ended) r.phase = 'ended';
  else if (!r.players.some((p) => p.character && p.character.hp > 0)) {
    r.phase = 'ended';
    sys(r, M(r, 'sys.wipe'));
  } else if (r.pendingRolls.length) r.phase = 'rolling';
  else if (!interject || r.phase === 'dmTurn') r.phase = 'action';
}

/** Mode DM manusia: game berhenti dan menunggu DM menulis narasi. */
function humanTurn(r, trigger) {
  r.lastTrigger = trigger;
  r.phase = 'dmTurn';
  const dm = r.players.find((p) => p.id === dmIdOf(r));
  sys(r, M(r, 'sys.waitDM', { name: dm?.name || 'DM' }));
  broadcast(r);
  if (r.settings.dmMode === 'assist') makeDraft(r);
}

/** Minta draf narasi dari AI untuk DM manusia (hanya dikirim ke DM, tidak ke pemain). */
async function makeDraft(r, hint = '') {
  const dm = r.players.find((p) => p.id === dmIdOf(r));
  if (!dm?.socketId || r.drafting) return;
  const hourAgo = now() - 3600_000;
  r.dmCalls = (r.dmCalls || []).filter((x) => x > hourAgo);
  if (!dmStatus().mock && r.dmCalls.length >= DM_MAX_PER_HOUR) {
    io.to(dm.socketId).emit('dm:draft', { error: M(r, 'sys.dmLimit', { n: DM_MAX_PER_HOUR, min: 60 }) });
    return;
  }
  r.dmCalls.push(now());
  r.drafting = true;
  io.to(dm.socketId).emit('dm:draft', { loading: true });
  try {
    const trig = r.lastTrigger || { kind: 'actions', actions: [] };
    const raw = await streamDM(r, hint ? { ...trig, hint: clean(hint, 300) } : trig, () => {});
    const { narration, state } = parseDM(raw);
    io.to(dm.socketId).emit('dm:draft', { narration, state });
  } catch (e) {
    io.to(dm.socketId).emit('dm:draft', { error: String(e.message || e).slice(0, 160) });
  } finally {
    r.drafting = false;
  }
}

async function runDM(r, trigger) {
  if (humanMode(r)) return humanTurn(r, trigger);
  if (r.dmBusy) return;
  // batas biaya: maksimal N panggilan DM per room per jam
  const hourAgo = now() - 3600_000;
  r.dmCalls = (r.dmCalls || []).filter((x) => x > hourAgo);
  if (!dmStatus().mock && r.dmCalls.length >= DM_MAX_PER_HOUR) {
    r.lastTrigger = trigger;
    r.phase = 'stalled';
    sys(r, M(r, 'sys.dmLimit', { n: DM_MAX_PER_HOUR, min: Math.ceil((r.dmCalls[0] + 3600_000 - now()) / 60000) }));
    broadcast(r);
    return;
  }
  r.dmCalls.push(now());
  r.dmBusy = true;
  r.lastTrigger = trigger;
  r.phase = 'narrating';
  const entry = addLog(r, { type: 'dm', text: '', streaming: true });
  broadcast(r);

  let sent = 0;
  try {
    const raw = await streamDM(r, trigger, (visible) => {
      if (visible.length > sent && visible.startsWith(entry.text)) {
        io.to(r.code).emit('dm:delta', { id: entry.id, delta: visible.slice(sent) });
        sent = visible.length;
        entry.text = visible;
      }
    });
    const { narration, state } = parseDM(raw);
    if (!narration) throw new Error('DM tidak mengirim narasi');
    entry.text = narration;
    entry.streaming = false;
    r.round += 1;
    const events = applyState(r, state);
    if (events.length) io.to(r.code).emit('stage:events', { events });
    settlePhase(r);
  } catch (e) {
    console.error('[dm]', e.message);
    r.log = r.log.filter((x) => x.id !== entry.id);
    sys(r, M(r, 'sys.dmFail', { err: e.message.slice(0, 140) }));
    r.phase = 'stalled';
  } finally {
    r.dmBusy = false;
    broadcast(r);
  }
}

// ---------- area, perjalanan, bos ----------
const areaSt = (r, id = r.area) => (r.areaState[id] ??= { cleared: 0, bossDefeated: false, visited: false });

/** Dipanggil setelah musuh berkurang: jika semua musuh habis, pertempuran dimenangkan. */
function checkVictory(r, hadEnemies) {
  if (!hadEnemies || r.enemies.length || !r.area) return;
  const st = areaSt(r);
  r.inCombat = false;
  if (st.bossDefeated) return;
  st.cleared += 1;
  const A = AREA_BY_ID[r.area];
  const left = Math.max(0, A.bossAfter - st.cleared);
  const boss = D(r).bossName(A.id, A.boss.name);
  sys(r, left ? M(r, 'sys.victory', { n: st.cleared, m: A.bossAfter, boss }) : M(r, 'sys.bossOpen', { boss }), true);
}

function onBossKilled(r, enemy) {
  if (!enemy.boss || !r.area) return;
  const st = areaSt(r);
  st.bossDefeated = true;
  sys(r, M(r, 'sys.conquered', { area: D(r).areaName(r.area, AREA_BY_ID[r.area].name) }), true);
}

function travel(r, areaId) {
  const A = AREA_BY_ID[areaId];
  if (!A) return;
  const leaving = r.enemies.map((e) => ({ kind: 'leave', target: e.id }));
  r.area = A.id;
  r.biome = A.biome;
  r.enemies = [];
  r.inCombat = false;
  r.votes = {};
  r.plans = {};
  r.pendingActions = {};
  const st = areaSt(r);
  const first = !st.visited;
  st.visited = true;
  sys(r, M(r, 'sys.travel', { area: D(r).areaName(A.id, A.name) }), true);
  io.to(r.code).emit('stage:events', { events: [...leaving, { kind: 'biome', biome: A.biome }] });
  runDM(r, { kind: 'travel', area: A.id, first });
}

function challengeBoss(r) {
  const A = AREA_BY_ID[r.area];
  const boss = { id: uid(), name: D(r).bossName(A.id, A.boss.name), type: A.boss.type, hp: A.boss.hp, maxHp: A.boss.hp, boss: true, weak: A.boss.weak, xp: Math.round(A.boss.hp * 3) };
  r.enemies = [boss];
  r.inCombat = true;
  r.plans = {};
  sys(r, M(r, 'sys.appears', { name: boss.name }), true);
  io.to(r.code).emit('stage:events', { events: [{ kind: 'spawn', enemy: boss, slot: 0 }] });
  runDM(r, { kind: 'boss', area: A.id, boss: boss.name });
}

function resolveActions(r) {
  tickCooldowns(r);
  const hadEnemies = r.enemies.length > 0;
  const actions = [];
  const events = [];
  const mechanics = [];
  for (const p of r.players) {
    const pa = p.character && r.pendingActions[p.id];
    if (!pa) continue;
    const skill = pa.skill ? skillsFor(p.character).find((s) => s.id === pa.skill) : null;
    const targetName = pa.target ? r.enemies.find((e) => e.id === pa.target)?.name || r.players.find((x) => x.id === pa.target)?.character?.name : null;
    const skillName = skill ? D(r).skillName(skill) : null;
    const text = pa.text || (skill ? M(r, 'act.useSkill', { skill: skillName, target: targetName ? M(r, 'act.useSkillOn', { target: targetName }) : '' }) : '');
    actions.push({ name: p.character.name, text, skill: skillName, target: targetName });
    addLog(r, { type: 'action', author: p.character.name, text, data: skill ? { skill: skillName, skillId: skill.id, target: targetName } : undefined });
    if (skill) {
      const res = resolveSkill(r, p, pa);
      if (res.offensive && r.enemies.length) r.inCombat = true;
      if (res.event) events.push(res.event);
      events.push(...res.extra);
      for (const n of res.notes) addLog(r, { type: 'combat', text: n });
      mechanics.push(...res.notes);
    }
  }
  if (r.__bossKilled) {
    onBossKilled(r, r.__bossKilled);
    delete r.__bossKilled;
  }
  checkVictory(r, hadEnemies);
  if (r.inCombat && r.enemies.some((e) => e.hp > 0)) {
    const turn = enemyTurn(r);
    events.push(...turn.events);
    for (const n of turn.notes) addLog(r, { type: 'combat', text: n, enemy: true });
    mechanics.push(...turn.notes);
  }
  const saves = deathSaves(r);
  if (saves.events.length) {
    events.push(...saves.events);
    for (const n of saves.notes) addLog(r, { type: 'combat', text: n, death: true });
    mechanics.push(...saves.notes);
    for (const ev of saves.events) {
      const p = r.players.find((x) => x.id === ev.target);
      io.to(r.code).emit('dice:rolled', { playerId: ev.target, name: p?.character?.name, stat: 'DEATH', dc: 10, d20: ev.d20, mod: 0, total: ev.d20, success: ev.d20 >= 10, reason: 'death save' });
    }
  }
  if (!r.enemies.length) r.inCombat = false;
  r.pendingActions = {};
  r.plans = {};
  if (events.length) io.to(r.code).emit('stage:events', { events });
  runDM(r, { kind: 'actions', actions, mechanics });
}

function checkActions(r) {
  if (r.phase !== 'action' || r.dmBusy) return;
  const req = requiredActors(r);
  if (req.length && Object.keys(r.pendingActions).length && req.every((p) => r.pendingActions[p.id])) resolveActions(r);
}

function rollFor(r, roll, auto = false) {
  const p = r.players.find((x) => x.id === roll.playerId);
  const c = p?.character;
  if (!c) return;
  let d20 = randomInt(1, 21);
  let lucky = false;
  if (d20 === 1 && c.raceId === 'halfling') {
    lucky = true;
    d20 = randomInt(1, 21);
  }
  const m = totalMod(c, roll.stat);
  const total = d20 + m;
  const success = d20 === 20 || (d20 !== 1 && total >= roll.dc);
  roll.result = { d20, mod: m, total, success, lucky, auto };
  const data = { name: c.name, stat: roll.stat, dc: roll.dc, reason: roll.reason, d20, mod: m, total, success, lucky, auto };
  addLog(r, { type: 'roll', author: c.name, data });
  io.to(r.code).emit('dice:rolled', { ...data, playerId: p.id });
}

function checkRolls(r) {
  if (r.phase !== 'rolling' || r.dmBusy) return;
  if (r.pendingRolls.every((x) => x.result)) {
    const rolls = r.pendingRolls;
    r.pendingRolls = [];
    // beri jeda agar animasi dadu sempat tampil
    setTimeout(() => runDM(r, { kind: 'rolls', rolls }), 1600);
    r.phase = 'narrating';
  }
}

function freeRoll(expr) {
  const m = String(expr).replace(/\s+/g, '').toLowerCase().match(/^(\d{0,2})d(\d{1,3})([+-]\d{1,3})?$/);
  if (!m) return null;
  const n = Math.min(20, Math.max(1, Number(m[1] || 1)));
  const sides = Math.min(100, Math.max(2, Number(m[2])));
  const bonus = Number(m[3] || 0);
  const dice = Array.from({ length: n }, () => randomInt(1, sides + 1));
  return { expr: `${n}d${sides}${bonus ? (bonus > 0 ? `+${bonus}` : bonus) : ''}`, dice, bonus, total: dice.reduce((a, b) => a + b, 0) + bonus };
}

// ---------- socket wiring ----------
/** Host terputus lebih dari HOST_GRACE_MS: jadikan pemain lain yang masih online sebagai host. */
function scheduleHostHandoff(r) {
  if (hostTimers.has(r.code)) return;
  hostTimers.set(
    r.code,
    setTimeout(() => {
      hostTimers.delete(r.code);
      const host = r.players.find((x) => x.id === r.hostId);
      if (host?.connected) return;
      const next = r.players.find((x) => x.connected);
      if (!next) return;
      r.hostId = next.id;
      sys(r, M(r, 'sys.newHost', { name: next.character?.name || next.name }));
      broadcast(r);
    }, HOST_GRACE_MS),
  );
}

export function registerGame(server) {
  io = server;
  loadRooms();
  setInterval(cleanup, 60 * 60 * 1000).unref();

  io.on('connection', (socket) => {
    let ctx = null;
    const room = () => (ctx ? rooms.get(ctx.code) : null);
    const me = () => room()?.players.find((p) => p.id === ctx.playerId);
    const isHost = () => room()?.hostId === ctx?.playerId;
    socket.data.lang = normLang(socket.handshake.auth?.lang);
    socket.on('lang:set', ({ lang } = {}) => (socket.data.lang = normLang(lang)));
    const fail = (cb, key, vars) => typeof cb === 'function' && cb({ ok: false, error: t(socket.data.lang, key, vars), code: key });
    const ok = (cb, data = {}) => typeof cb === 'function' && cb({ ok: true, ...data });
    // batas laju per koneksi: mencegah spam yang memicu banyak panggilan AI
    socket.data.rl = {};
    const allow = (key, max, perMs) => {
      const t0 = now();
      const list = (socket.data.rl[key] = (socket.data.rl[key] || []).filter((x) => t0 - x < perMs));
      if (list.length >= max) return false;
      list.push(t0);
      return true;
    };
    const ip = String(socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '').split(',')[0].trim();

    function attach(r, p) {
      ctx = { code: r.code, playerId: p.id };
      p.connected = true;
      p.socketId = socket.id;
      socket.join(r.code);
    }
    const newPlayer = (name) => ({ id: uid(), token: randomBytes(16).toString('hex'), name, character: null, connected: true, socketId: null });

    socket.on('room:create', ({ name, lang } = {}, cb) => {
      name = clean(name, 24);
      if (!name) return fail(cb, 'err.name');
      if (rooms.size >= MAX_ROOMS) return fail(cb, 'err.serverFull');
      const hourAgo = now() - 3600_000;
      const mine = (ipCreates.get(ip) || []).filter((x) => x > hourAgo);
      if (mine.length >= ROOMS_PER_IP_HOUR) return fail(cb, 'err.slow');
      ipCreates.set(ip, [...mine, now()]);
      const r = {
        code: genCode(),
        hostId: null,
        createdAt: now(),
        updatedAt: now(),
        settings: { campaign: 'kabut', premise: '', language: normLang(lang || socket.data.lang), dmStyle: 'kocak', dmMode: 'ai' },
        phase: 'lobby',
        players: [],
        log: [],
        pendingActions: {},
        pendingRolls: [],
        summary: '',
        scene: '',
        round: 0,
        dmBusy: false,
        ended: false,
        enemies: [],
        biome: 'forest',
        chat: [],
        plans: {},
        votes: {},
        area: null,
        areaState: {},
      };
      const p = newPlayer(name);
      r.players.push(p);
      r.hostId = p.id;
      rooms.set(r.code, r);
      sys(r, M(r, 'sys.opened', { name }));
      attach(r, p);
      ok(cb, { code: r.code, playerId: p.id, token: p.token });
      broadcast(r);
    });

    socket.on('room:join', ({ code, name, token, password } = {}, cb) => {
      if (!allow('join', 12, 60_000)) return fail(cb, 'err.slow');
      code = clean(code, 8).toUpperCase();
      const r = rooms.get(code);
      if (!r) return fail(cb, 'err.noRoom');
      if (token && (r.banned || []).includes(token)) return fail(cb, 'err.kicked');
      let p = token ? r.players.find((x) => x.token === token) : null;
      if (!p) {
        name = clean(name, 24);
        if (!name) return fail(cb, 'err.name');
        if (r.settings.password && String(password || '') !== r.settings.password) return fail(cb, 'err.password');
        if ((r.bannedNames || []).includes(name.toLowerCase())) return fail(cb, 'err.kicked');
        if (r.players.length >= MAX_PLAYERS) return fail(cb, 'err.full', { n: MAX_PLAYERS });
        if (r.players.some((x) => x.name.toLowerCase() === name.toLowerCase())) return fail(cb, 'err.nameTaken');
        p = newPlayer(name);
        r.players.push(p);
        sys(r, M(r, 'sys.joined', { name }));
      } else if (p.socketId && p.socketId !== socket.id) {
        io.sockets.sockets.get(p.socketId)?.disconnect(true);
      }
      attach(r, p);
      if (p.id === r.hostId) {
        clearTimeout(hostTimers.get(r.code));
        hostTimers.delete(r.code);
      } else if (!r.players.find((x) => x.id === r.hostId)?.connected) scheduleHostHandoff(r);
      ok(cb, { code, playerId: p.id, token: p.token });
      broadcast(r);
    });

    socket.on('char:set', ({ name, classId, raceId, backstory, look } = {}, cb) => {
      const r = room();
      const p = me();
      if (!r || !p) return fail(cb, 'err.notIn');
      if (p.character && r.phase !== 'lobby') return fail(cb, 'err.charLocked');
      name = clean(name || p.name, 24);
      if (!CLASSES[classId] || !RACES[raceId]) return fail(cb, 'err.pickRaceClass');
      if (r.players.some((x) => x.id !== p.id && x.character?.name.toLowerCase() === name.toLowerCase())) return fail(cb, 'err.charNameTaken');
      const isNew = !p.character;
      p.character = buildCharacter({ name, classId, raceId, backstory: clean(backstory, 300), look });
      if (isNew && r.phase !== 'lobby') sys(r, M(r, 'sys.joinedParty', { name, race: D(r).race(raceId, RACES[raceId].label), cls: CLASSES[classId].label }), true);
      ok(cb);
      broadcast(r);
    });

    socket.on('room:settings', (s = {}, cb) => {
      const r = room();
      if (!r || !isHost()) return fail(cb, 'err.hostOnly');
      if (typeof s.password === 'string') {
        r.settings.password = clean(s.password, 32);
        ok(cb);
        return broadcast(r);
      }
      // mode DM boleh diganti kapan saja; AI langsung mengambil alih giliran DM yang tertunda
      if (DM_MODES.includes(s.dmMode) && r.settings.dmMode !== s.dmMode && r.phase !== 'lobby') {
        r.settings.dmMode = s.dmMode;
        sys(r, M(r, `sys.dmMode.${s.dmMode}`));
        ok(cb);
        if (r.phase === 'dmTurn' && s.dmMode === 'ai') runDM(r, r.lastTrigger || { kind: 'actions', actions: [] });
        else if (r.phase === 'dmTurn' && s.dmMode === 'assist') makeDraft(r);
        return broadcast(r);
      }
      // gaya DM boleh diganti kapan saja (berlaku mulai narasi berikutnya)
      if (DM_STYLES.includes(s.dmStyle) && r.phase !== 'lobby') {
        if (r.settings.dmStyle !== s.dmStyle) sys(r, M(r, 'sys.dmStyle', { style: M(r, `dmStyle.${s.dmStyle}`) }));
        r.settings.dmStyle = s.dmStyle;
        ok(cb);
        return broadcast(r);
      }
      if (r.phase !== 'lobby') return fail(cb, 'err.started');
      if (CAMPAIGNS.some((c) => c.id === s.campaign)) r.settings.campaign = s.campaign;
      if (typeof s.premise === 'string') r.settings.premise = String(s.premise).slice(0, 600);
      if (s.language === 'id' || s.language === 'en') r.settings.language = s.language;
      if (DM_STYLES.includes(s.dmStyle)) r.settings.dmStyle = s.dmStyle;
      if (DM_MODES.includes(s.dmMode)) r.settings.dmMode = s.dmMode;
      ok(cb);
      broadcast(r);
    });

    socket.on('game:start', (_, cb) => {
      const r = room();
      if (!r || !isHost()) return fail(cb, 'err.hostOnly');
      if (r.phase !== 'lobby') return fail(cb, 'err.started');
      if (!r.players.some((p) => p.character && p.id !== dmIdOf(r))) return fail(cb, 'err.needChar');
      if (r.settings.campaign === 'custom' && !r.settings.premise.trim()) return fail(cb, 'err.needPremise');
      sys(r, M(r, 'sys.start'));
      r.area = START_AREA[r.settings.campaign] || 'hutan';
      r.biome = AREA_BY_ID[r.area].biome;
      areaSt(r).visited = true;
      // faksi awal kampanye (reputasi 0) dalam bahasa narasi
      const camp = CAMPAIGNS.find((c) => c.id === r.settings.campaign);
      const W = world(r);
      for (const [idName, enName] of camp?.factions || []) W.factions[r.settings.language === 'en' ? enName : idName] ??= 0;
      ok(cb);
      runDM(r, { kind: 'opening' });
    });

    socket.on('action:submit', ({ text, skill, target } = {}, cb) => {
      if (!allow('act', 8, 5000)) return fail(cb, 'err.slow');
      const r = room();
      const p = me();
      if (!r || !p?.character) return fail(cb, 'err.makeChar');
      if (r.phase !== 'action') return fail(cb, 'err.notYourTurn');
      if (p.character.hp <= 0) return fail(cb, 'err.down');
      text = clean(text, 500);
      const sk = skill ? skillsFor(p.character).find((s) => s.id === skill) : null;
      if (skill && !sk) return fail(cb, 'err.unknownSkill');
      if (sk && p.character.cooldowns?.[sk.id] > 0) return fail(cb, 'err.cooldown', { skill: dataT(socket.data.lang).skillName(sk), n: p.character.cooldowns[sk.id] });
      let tgt = null;
      if (sk && target) {
        const okEnemy = r.enemies.some((e) => e.id === target && e.hp > 0);
        const okAlly = r.players.some((x) => x.id === target && x.character);
        if ((sk.ally && okAlly) || (!sk.ally && okEnemy)) tgt = target;
      }
      if (!text && !sk) return fail(cb, 'err.needAction');
      r.pendingActions[p.id] = { text, skill: sk?.id || null, target: tgt };
      ok(cb);
      broadcast(r);
      checkActions(r);
    });

    socket.on('action:cancel', (_, cb) => {
      const r = room();
      if (!r || r.phase !== 'action') return fail(cb, 'err.cannot');
      delete r.pendingActions[ctx.playerId];
      ok(cb);
      broadcast(r);
    });

    socket.on('action:force', (_, cb) => {
      const r = room();
      if (!r || !(isHost() || ctx?.playerId === dmIdOf(r))) return fail(cb, 'err.hostOnly');
      if (r.phase !== 'action' || r.dmBusy) return fail(cb, 'err.notNow');
      ok(cb);
      resolveActions(r);
    });

    socket.on('roll:do', ({ id } = {}, cb) => {
      const r = room();
      if (!r || r.phase !== 'rolling') return fail(cb, 'err.noRoll');
      const roll = r.pendingRolls.find((x) => x.id === id && x.playerId === ctx.playerId && !x.result);
      if (!roll) return fail(cb, 'err.rollNotFound');
      rollFor(r, roll);
      ok(cb);
      checkRolls(r);
      broadcast(r);
    });

    socket.on('roll:auto', (_, cb) => {
      const r = room();
      if (!r || !(isHost() || ctx?.playerId === dmIdOf(r)) || r.phase !== 'rolling') return fail(cb, 'err.cannot');
      for (const roll of r.pendingRolls) if (!roll.result) rollFor(r, roll, true);
      ok(cb);
      checkRolls(r);
      broadcast(r);
    });

    socket.on('dm:retry', (_, cb) => {
      if (!allow('retry', 3, 10000)) return fail(cb, 'err.slow');
      const r = room();
      if (!r || !isHost()) return fail(cb, 'err.hostOnly');
      if (r.dmBusy || r.phase !== 'stalled') return fail(cb, 'err.notStalled');
      ok(cb);
      runDM(r, r.lastTrigger || { kind: 'actions', actions: [] });
    });

    socket.on('game:continue', (_, cb) => {
      const r = room();
      if (!r || !isHost() || r.phase !== 'ended') return fail(cb, 'err.cannot');
      r.ended = false;
      const leaving = r.enemies.map((e) => ({ kind: 'leave', target: e.id }));
      r.enemies = [];
      for (const p of r.players) {
        const c = p.character;
        if (!c) continue;
        if (c.death?.dead) {
          // gugur: bangkit dengan separuh HP dan kehilangan seperempat gold
          const lost = Math.floor((c.gold || 0) / 4);
          c.gold -= lost;
          Object.assign(c, { hp: Math.ceil(c.maxHp / 2), cooldowns: {}, status: {} });
          sys(r, M(r, 'sys.revived', { name: c.name, gold: lost }), true);
        } else Object.assign(c, { hp: c.maxHp, cooldowns: {}, status: {} });
        delete c.death;
      }
      r.inCombat = false;
      if (leaving.length) io.to(r.code).emit('stage:events', { events: leaving });
      sys(r, M(r, 'sys.rest'), true);
      ok(cb);
      runDM(r, { kind: 'actions', actions: [] });
    });

    socket.on('chat:send', ({ text, quick } = {}, cb) => {
      if (!allow('chat', 6, 5000)) return fail(cb, 'err.slow');
      const r = room();
      const p = me();
      if (!r || !p) return fail(cb, 'err.notIn');
      text = clean(text, 300);
      if (!text) return fail(cb, 'err.empty');
      const msg = { id: uid(), at: now(), pid: p.id, author: p.character?.name || p.name, text, quick: !!quick };
      if (/^\/(r|roll)\s+/i.test(text)) {
        const res = freeRoll(text.replace(/^\/(r|roll)\s+/i, ''));
        if (!res) return fail(cb, 'err.rollFormat');
        msg.roll = res;
      }
      r.chat.push(msg);
      if (r.chat.length > 200) r.chat.splice(0, r.chat.length - 200);
      ok(cb);
      // kirim pesan saja, bukan seluruh state room: jauh lebih ringan
      io.to(r.code).emit('chat:msg', msg);
      scheduleSave();
    });

    socket.on('chat:typing', () => {
      if (!allow('typing', 3, 3000)) return;
      const r = room();
      const p = me();
      if (r && p) socket.to(r.code).emit('chat:typing', { id: p.id, name: p.character?.name || p.name });
    });

    socket.on('plan:set', ({ skill, target } = {}, cb) => {
      if (!allow('plan', 12, 5000)) return fail(cb, 'err.slow');
      const r = room();
      const p = me();
      if (!r || !p?.character || r.phase !== 'action') return fail(cb, 'err.cannot');
      const sk = skill ? skillsFor(p.character).find((x) => x.id === skill) : null;
      if (!sk) delete r.plans[p.id];
      else {
        const tgt = target && (r.enemies.some((e) => e.id === target) || r.players.some((x) => x.id === target)) ? target : null;
        r.plans[p.id] = { skill: sk.id, name: sk.name, target: tgt };
      }
      ok(cb);
      io.to(r.code).emit('room:plans', r.plans);
    });

    socket.on('map:vote', ({ area } = {}, cb) => {
      if (!allow('vote', 8, 5000)) return fail(cb, 'err.slow');
      const r = room();
      const p = me();
      if (!r || !p) return fail(cb, 'err.notIn');
      if (!AREA_BY_ID[area]) return fail(cb, 'err.unknownArea');
      if (r.phase !== 'action' || r.dmBusy) return fail(cb, 'err.waitTurn');
      if (r.inCombat && r.enemies.length) return fail(cb, 'err.noTravelCombat');
      if (area === r.area) delete r.votes[p.id];
      else if (r.votes[p.id] === area) delete r.votes[p.id];
      else r.votes[p.id] = area;
      ok(cb);
      const voters = r.players.filter((x) => x.character && x.connected);
      if (voters.length && voters.every((x) => r.votes[x.id] === area)) {
        sys(r, M(r, 'sys.agree'));
        travel(r, area);
      } else broadcast(r);
    });

    socket.on('map:travel', ({ area } = {}, cb) => {
      const r = room();
      if (!r || !isHost()) return fail(cb, 'err.hostOnly');
      if (!AREA_BY_ID[area] || area === r.area) return fail(cb, 'err.otherArea');
      if (r.phase !== 'action' || r.dmBusy) return fail(cb, 'err.waitTurn');
      if (r.inCombat && r.enemies.length) return fail(cb, 'err.noTravelCombat');
      ok(cb);
      travel(r, area);
    });

    socket.on('boss:challenge', (_, cb) => {
      const r = room();
      if (!r || !isHost()) return fail(cb, 'err.hostOnly');
      const A = AREA_BY_ID[r.area];
      const st = A && areaSt(r);
      if (!A || st.bossDefeated) return fail(cb, 'err.bossDone');
      if (st.cleared < A.bossAfter) return fail(cb, 'err.winMore', { n: A.bossAfter - st.cleared });
      if (r.phase !== 'action' || r.dmBusy || (r.inCombat && r.enemies.length)) return fail(cb, 'err.notNow');
      ok(cb);
      challengeBoss(r);
    });

    // ---------- Dungeon Master manusia ----------
    const isDM = () => {
      const r = room();
      return !!r && humanMode(r) && ctx?.playerId === dmIdOf(r);
    };

    socket.on('dm:seat', ({ to } = {}, cb) => {
      const r = room();
      if (!r || !isHost()) return fail(cb, 'err.hostOnly');
      const target = r.players.find((x) => x.id === to);
      if (!target) return fail(cb, 'err.cannot');
      r.dmId = target.id;
      sys(r, M(r, 'sys.newDM', { name: target.character?.name || target.name }));
      ok(cb);
      broadcast(r);
    });

    socket.on('dm:narrate', ({ text, state } = {}, cb) => {
      if (!allow('dm', 10, 10000)) return fail(cb, 'err.slow');
      const r = room();
      if (!r || !isDM()) return fail(cb, 'err.dmOnly');
      if (r.phase === 'lobby' || r.dmBusy) return fail(cb, 'err.notNow');
      const narration = String(text ?? '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 4000);
      let st = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
      if (JSON.stringify(st).length > 12000) st = {};
      if (!narration && !Object.keys(st).length) return fail(cb, 'err.empty');
      const interject = r.phase !== 'dmTurn';
      if (narration) addLog(r, { type: 'dm', text: narration, human: true });
      if (!interject) r.round += 1;
      const events = applyState(r, st, { interject });
      if (events.length) io.to(r.code).emit('stage:events', { events });
      if (r.phase !== 'ended' || r.ended) settlePhase(r, interject);
      ok(cb);
      broadcast(r);
    });

    socket.on('dm:draft', ({ hint } = {}, cb) => {
      if (!allow('draft', 3, 15000)) return fail(cb, 'err.slow');
      const r = room();
      if (!r || !isDM()) return fail(cb, 'err.dmOnly');
      if (r.drafting) return fail(cb, 'err.notNow');
      ok(cb);
      makeDraft(r, hint);
    });

    /** Konsol DM: lihat rahasia NPC (tidak ikut di state publik). */
    socket.on('dm:secrets', (_, cb) => {
      const r = room();
      if (!r || !isDM()) return fail(cb, 'err.dmOnly');
      ok(cb, { npcs: world(r).npcs, weak: r.enemies.filter((e) => e.boss).map((e) => ({ name: e.name, weak: e.weak })) });
    });

    socket.on('host:transfer', ({ to } = {}, cb) => {
      const r = room();
      if (!r || !isHost()) return fail(cb, 'err.hostOnly');
      const target = r.players.find((x) => x.id === to);
      if (!target || target.id === r.hostId) return fail(cb, 'err.cannot');
      r.hostId = target.id;
      sys(r, M(r, 'sys.newHost', { name: target.character?.name || target.name }));
      ok(cb);
      broadcast(r);
    });

    socket.on('player:kick', ({ id } = {}, cb) => {
      const r = room();
      if (!r || !isHost()) return fail(cb, 'err.hostOnly');
      const target = r.players.find((x) => x.id === id);
      if (!target || target.id === r.hostId) return fail(cb, 'err.cannot');
      r.players = r.players.filter((x) => x.id !== id);
      (r.banned ??= []).push(target.token);
      (r.bannedNames ??= []).push(target.name.toLowerCase());
      delete r.pendingActions[id];
      delete r.votes[id];
      delete r.plans[id];
      r.pendingRolls = r.pendingRolls.filter((x) => x.playerId !== id);
      const s2 = target.socketId && io.sockets.sockets.get(target.socketId);
      if (s2) {
        s2.emit('room:kicked');
        s2.leave(r.code);
      }
      sys(r, M(r, 'sys.kicked', { name: target.character?.name || target.name }));
      ok(cb);
      broadcast(r);
      checkActions(r);
      checkRolls(r);
    });

    socket.on('shop:buy', ({ item } = {}, cb) => {
      if (!allow('shop', 6, 5000)) return fail(cb, 'err.slow');
      const r = room();
      const p = me();
      if (!r || !p?.character) return fail(cb, 'err.makeChar');
      if (r.phase === 'lobby') return fail(cb, 'err.cannot');
      if (r.inCombat && r.enemies.length) return fail(cb, 'err.shopCombat');
      if (!SHOP_STOCK.includes(item)) return fail(cb, 'err.cannot');
      const I = ITEMS[item];
      const c = ensureProgress(p.character);
      if (c.death?.dead) return fail(cb, 'err.down');
      if ((c.gold || 0) < I.price) return fail(cb, 'err.noGold');
      if (I.type !== 'potion' && c.inv.some((x) => x.id === item && x.qty > 0)) return fail(cb, 'err.owned');
      c.gold -= I.price;
      addItem(c, item);
      sys(r, M(r, 'sys.bought', { name: c.name, item: D(r).itemName(item, I.name), n: I.price }));
      ok(cb);
      io.to(r.code).emit('stage:events', { events: [{ kind: 'item', target: p.id, item }] });
      broadcast(r);
    });

    socket.on('disconnect', () => {
      const r = room();
      const p = me();
      if (!r || !p || p.socketId !== socket.id) return;
      p.connected = false;
      p.socketId = null;
      if (p.id === r.hostId) scheduleHostHandoff(r);
      broadcast(r);
      checkActions(r);
    });
  });
}

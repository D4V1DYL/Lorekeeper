// Panggung pertarungan pixel art. Efek, pose, dan hit-stop dari pixelfx (MIT); karakter memakai rig pixelfx
// yang diwarnai ulang per bagian tubuh sesuai kustomisasi pemain.

import { createFrame, clearFrame, createFx, composite, poseAt, READY, STAND, posed, actorAlphaOf, Target, painterFor, hex, mix, rand } from '../pixelfx/core/index.js';
import { ENEMY_TYPES, skillsFor } from '../data.js';
import { loadFx } from './fxmap.js';
import { getSprite } from './sprites.js';
import { t as tr } from '../i18n.js';

export const W = 320;
export const H = 180;
const HORIZON = 112;
const GROUND = 146;
const INK = hex('#120d16');
const WHITE = hex('#ffffff');
const GRAY = hex('#6d6a78');
const STEEL = '#a8adb8';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const HERO_SLOTS = [[100, 160], [80, 168], [66, 155], [46, 165], [30, 156], [116, 170]];
const ENEMY_SLOTS = [[222, 160], [244, 168], [262, 155], [282, 165], [300, 157], [206, 170]];

// ---------- warna ----------
function toHsl(c) {
  const r = (c & 255) / 255, g = ((c >>> 8) & 255) / 255, b = ((c >>> 16) & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h, s, l) {
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return (255 << 24) | (f(4) << 16) | (f(8) << 8) | f(0);
}
/** 4 nada dari terang ke gelap, dengan geser hue ala pixel artist (terang hangat, gelap dingin). */
export function rampOf(base) {
  const [h, s, l] = toHsl(hex(base));
  const shift = (dh) => (h + dh + 1) % 1;
  return [
    fromHsl(shift(-0.02), Math.min(1, s * 0.95), Math.min(0.93, l + 0.16)),
    hex(base),
    fromHsl(shift(0.02), Math.min(1, s * 1.05), Math.max(0.05, l - 0.17)),
    fromHsl(shift(0.04), Math.min(1, s * 1.1), Math.max(0.03, l - 0.3)),
  ];
}

function paletteOf(look) {
  const skin = rampOf(look.skin), outfit = rampOf(look.outfit), pants = rampOf(look.pants), boots = rampOf(look.boots || '#4a2e22');
  const hair = look.hairstyle === 'botak' ? skin : look.hairstyle === 'tudung' ? rampOf(look.outfit) : look.hairstyle === 'helm' ? rampOf(STEEL) : rampOf(look.hair);
  const byPart = new Array(25).fill(outfit);
  byPart[5] = hair;
  byPart[6] = skin;
  byPart[4] = look.hairstyle === 'tudung' ? outfit : skin;
  byPart[10] = byPart[14] = skin; // tangan
  for (const p of [1, 15, 16, 17, 19, 20, 21]) byPart[p] = pants;
  byPart[18] = byPart[22] = boots;
  return { byPart, mark: hex(look.hairstyle === 'helm' ? '#d9a94e' : '#f08a3c') };
}

// ---------- pose ----------
const CAST = { crouch: 2, fx: 10, fy: -31, bx: 13, by: -28, lean: -1 };
const DOWN = { crouch: 10, lean: 7, fx: 7, fy: -5, bx: 10, by: -6, ffx: 5, fbx: -7, hy: 2 };
const HURT = { crouch: 3, lean: -3, fx: -2, fy: -20, bx: 4, by: -19 };

function idlePose(actor, time) {
  const base = actor.down ? { ...DOWN } : actor.casting > 0 ? { ...CAST } : actor.flash > 0 ? { ...HURT } : { ...READY };
  if (!actor.down) {
    const up = Math.floor(time * 3 + actor.phase) & 1;
    base.crouch = (base.crouch ?? 0) + up;
    base.fy = (base.fy ?? READY.fy) + up;
    base.by = (base.by ?? READY.by) + up;
  }
  return withWeapon(base, actor.weapon);
}
function walkPose(actor, time) {
  const s = Math.sin(time * 14 + actor.phase);
  return withWeapon({ ...STAND, crouch: 1, ffx: -2 + s * 5, fbx: 3 - s * 5, ffy: -4 - Math.max(0, s) * 3, fby: -4 - Math.max(0, -s) * 3, fx: -3 - s * 3, bx: 5 + s * 3 }, actor.weapon);
}
const withWeapon = (q, weapon) => (weapon && weapon !== 'none' ? { ...q, weapon } : q);

// ---------- backdrop per biome ----------
const BIOME = {
  forest: { sky: ['#0f1a24', '#2a4a4a'], far: '#1d3332', near: '#132422', ground: ['#4f7a3a', '#2f4a2a', '#253a22', '#1a2a18'], props: 'pines', decor: [], weather: 'weather/fireflies' },
  dungeon: { sky: ['#0c0a10', '#1d1824'], far: '#221c2c', near: '#18131f', ground: ['#4a4263', '#2b2639', '#211d2d', '#1a1724'], props: 'pillars', decor: [['fire/torch', 44, 122], ['fire/torch', 276, 122]], weather: null },
  cave: { sky: ['#0a0a0e', '#1a1a22'], far: '#20202a', near: '#15151d', ground: ['#4a4652', '#2e2b35', '#25222b', '#1b1920'], props: 'stalactites', decor: [['fire/campfire', 160, 150]], weather: null },
  town: { sky: ['#1a1830', '#5a4060'], far: '#2a2440', near: '#1e1a2e', ground: ['#7a6a5a', '#4a3f38', '#3a322c', '#2a2420'], props: 'houses', decor: [['fire/brazier', 160, 146]], weather: null },
  castle: { sky: ['#120e1c', '#3a2840'], far: '#2a2034', near: '#1c1626', ground: ['#5a5470', '#36324a', '#2a273a', '#1e1c2a'], props: 'battlements', decor: [['fire/torch', 40, 120], ['fire/torch', 280, 120]], weather: null },
  plains: { sky: ['#1a2a4a', '#6a7aa0'], far: '#3a4a5a', near: '#2a3a3a', ground: ['#6a9a4a', '#3f6a32', '#2f522a', '#223a1e'], props: 'hills', decor: [], weather: 'weather/clouds' },
  coast: { sky: ['#14263a', '#4a7a9a'], far: '#2a4a6a', near: '#1a3450', ground: ['#d8c48a', '#a8945a', '#8a7448', '#6a5838'], props: 'waves', decor: [], weather: null },
  swamp: { sky: ['#141a14', '#3a4a30'], far: '#24301f', near: '#1a2418', ground: ['#4a5a30', '#2f3a22', '#26301c', '#1c2414'], props: 'deadtrees', decor: [], weather: 'weather/fog' },
  snow: { sky: ['#1a2238', '#6a7a9a'], far: '#4a5a7a', near: '#38465e', ground: ['#e8eef8', '#b8c4d8', '#98a6c0', '#7a88a4'], props: 'pines', decor: [], weather: 'weather/snow' },
};

function buildBackdrop(name) {
  const b = BIOME[name] || BIOME.plains;
  const out = new Uint32Array(W * H);
  const s0 = hex(b.sky[0]), s1 = hex(b.sky[1]), far = hex(b.far), near = hex(b.near);
  const g = b.ground.map(hex);
  const enclosed = name === 'dungeon' || name === 'cave';
  // langit / dinding
  for (let y = 0; y < GROUND; y++)
    for (let x = 0; x < W; x++) {
      const t = y / GROUND, step = Math.min(4, (t * 5 + BAYER[((y & 3) << 2) | (x & 3)] / 16) | 0);
      let c = mix(s0, s1, step / 4);
      if (!enclosed && rand(x, y, 77) > 0.995 && y < HORIZON - 30) c = mix(c, hex('#e8e0ff'), 0.6);
      if (enclosed && ((x + (Math.floor(y / 8) % 2) * 8) % 16 === 0 || y % 8 === 0)) c = mix(c, hex('#000000'), 0.35);
      out[y * W + x] = c;
    }
  // siluet jauh: perbukitan
  for (let x = 0; x < W; x++) {
    const hgt = HORIZON - 14 - Math.round(10 * Math.sin(x * 0.021 + 1.3) + 6 * Math.sin(x * 0.057 + 0.4) + 3 * Math.sin(x * 0.13));
    for (let y = Math.max(0, hgt); y < GROUND; y++) if (!enclosed) out[y * W + x] = far;
  }
  // properti dekat
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < GROUND) out[y * W + x] = c; };
  const props = b.props;
  if (props === 'pines' || props === 'deadtrees') {
    for (let i = 0; i < 14; i++) {
      const cx = Math.round(i * 24 + rand(i, 3) * 14 - 6), hgt = 34 + Math.round(rand(i, 9) * 30), base = GROUND;
      for (let y = 0; y < hgt; y++) {
        const w = props === 'pines' ? Math.round(((y / hgt) * 9) * (1 - ((y % 8) / 8) * 0.35)) : y < hgt * 0.35 ? 0 : 1;
        for (let dx = -w; dx <= w; dx++) put(cx + dx, base - hgt + y, near);
      }
      if (props === 'deadtrees') for (let k = 0; k < 3; k++) { const by = base - hgt + 8 + k * 7, dir = k % 2 ? 1 : -1; for (let j = 0; j < 7; j++) put(cx + dir * j, by - (j >> 1), near); }
      for (let y = 0; y < 6; y++) put(cx, base - y, near);
    }
  } else if (props === 'pillars' || props === 'battlements') {
    for (let i = 0; i < 6; i++) {
      const cx = 18 + i * 58;
      for (let y = props === 'battlements' ? 40 : 0; y < GROUND; y++) for (let dx = -7; dx <= 7; dx++) put(cx + dx, y, Math.abs(dx) > 5 ? mix(near, INK, 0.4) : dx < -2 ? mix(near, WHITE, 0.06) : near);
      if (props === 'battlements') for (let dx = -10; dx <= 10; dx++) for (let y = 34; y < 40; y++) if ((dx + 10) % 7 < 4) put(cx + dx, y, near);
    }
    if (props === 'battlements') for (let x = 0; x < W; x++) for (let y = 90; y < 96; y++) put(x, y, mix(near, INK, 0.2));
  } else if (props === 'stalactites') {
    for (let i = 0; i < 22; i++) {
      const cx = Math.round(rand(i, 1) * W), len = 8 + Math.round(rand(i, 2) * 26);
      for (let y = 0; y < len; y++) { const w = Math.round((1 - y / len) * 4); for (let dx = -w; dx <= w; dx++) put(cx + dx, y, near); }
    }
  } else if (props === 'houses') {
    for (let i = 0; i < 6; i++) {
      const x0 = i * 56 - 4, w = 38 + Math.round(rand(i, 4) * 10), h = 28 + Math.round(rand(i, 5) * 16), top = GROUND - h;
      for (let y = top; y < GROUND; y++) for (let x = x0; x < x0 + w; x++) put(x, y, near);
      for (let k = 0; k < w / 2 + 2; k++) for (let x = x0 - 2 + k; x < x0 + w + 2 - k; x++) put(x, top - k, mix(near, INK, 0.25));
      for (let wy = top + 8; wy < GROUND - 8; wy += 12) for (let wx = x0 + 6; wx < x0 + w - 6; wx += 12) for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) put(wx + x, wy + y, hex('#f2b45a'));
    }
  } else if (props === 'waves') {
    for (let x = 0; x < W; x++) for (let y = HORIZON - 2; y < GROUND; y++) out[y * W + x] = (y + Math.round(Math.sin(x * 0.2 + y) * 1.5)) % 5 === 0 ? mix(near, WHITE, 0.25) : near;
  } else if (props === 'hills') {
    for (let x = 0; x < W; x++) { const hgt = GROUND - 16 - Math.round(8 * Math.sin(x * 0.035 + 2)); for (let y = hgt; y < GROUND; y++) out[y * W + x] = near; }
  }
  // lampu: cahaya hangat dipanggang ke latar di sekitar obor/api (murah: dihitung sekali per biome)
  for (const [id, lx, ly] of b.decor) {
    const cy = ly - (id === 'fire/torch' ? 26 : 12), R = id === 'fire/torch' ? 46 : 60, warm = hex('#ffb05a');
    for (let y = Math.max(0, cy - R); y < Math.min(H, cy + R); y++)
      for (let x = Math.max(0, lx - R); x < Math.min(W, lx + R); x++) {
        const d = Math.hypot(x - lx, (y - cy) * 1.15) / R;
        if (d >= 1) continue;
        const k = (1 - d) * (1 - d) * 0.42, band = Math.min(1, Math.floor((k + BAYER[((y & 3) << 2) | (x & 3)] / 64) * 6) / 6);
        out[y * W + x] = mix(out[y * W + x], warm, band);
      }
  }
  // tanah
  for (let y = GROUND; y < H; y++)
    for (let x = 0; x < W; x++) {
      const gy = y - GROUND;
      let c;
      if (gy === 0) c = g[0];
      else if (gy < 3) c = g[1];
      else {
        const row = Math.floor((gy - 3) / 6), off = row % 2 ? 7 : 0, seam = (gy - 3) % 6 === 5 || (x + off) % 14 === 0;
        c = seam ? g[3] : rand(x, y, 5) > 0.93 ? g[1] : g[2];
      }
      out[y * W + x] = c;
    }
  for (const [id, lx, ly] of b.decor) {
    const R = 52, warm = hex('#ffb05a');
    for (let y = GROUND; y < H; y++)
      for (let x = Math.max(0, lx - R); x < Math.min(W, lx + R); x++) {
        const d = Math.hypot(x - lx, (y - GROUND) * 2.2) / R;
        if (d < 1) out[y * W + x] = mix(out[y * W + x], warm, (1 - d) * (1 - d) * 0.3);
      }
  }
  return out;
}

// ---------- aktor ----------
let nextPhase = 0;
class Actor {
  constructor(o) {
    Object.assign(this, { act: null, walk: null, knock: 0, knockV: 0, flash: 0, casting: 0, alpha: 1, down: false, dying: false, gone: false, hp: 1, maxHp: 1, phase: (nextPhase += 0.37) });
    this.update(o);
    this.x = this.homeX;
    this.y = this.homeY;
  }
  update(o) {
    Object.assign(this, o);
    if (o.look) {
      this.weapon = o.look.weapon;
      this.palette = paletteOf(o.look);
    }
    if (o.type && ENEMY_TYPES[o.type]?.kind === 'sprite') this.sprite = ENEMY_TYPES[o.type].sprite;
  }
}

// ---------- panggung ----------
export class Stage {
  constructor(canvas, { preview = false, onPick, lowPower = false, lang = 'id', sfx } = {}) {
    this.lang = lang;
    this.sfx = sfx || (() => {});
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext('2d');
    this.frame = createFrame(W, H);
    this.amb = createFrame(W, H); // lapisan suasana (obor, cuaca) di-cache, diperbarui 15 fps
    this.ambT = 0;
    this.ambDirty = true;
    this.img = new ImageData(W, H);
    this.actors = new Map();
    this.acts = [];
    this.effects = [];
    this.queue = [];
    this.running = false;
    this.freeze = 0;
    this.shakeT = 0;
    this.shake0 = 0;
    this.amp = 0;
    this.time = 0;
    this.preview = preview;
    this.onPick = onPick;
    this.highlight = null;
    this.biome = null;
    this.decor = [];
    this.pendingEnemies = null;
    this.lowPower = lowPower;
    this.reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.paused = false;
    this.acc = 0;
    this.stats = { frames: 0, ms: 0 };
    this.setBiome(preview ? 'plains' : 'forest');
    this.last = performance.now();
    this.alive = true;
    this.tick = this.tick.bind(this);
    this.raf = requestAnimationFrame(this.tick);
    this.onClick = this.onClick.bind(this);
    canvas.addEventListener('click', this.onClick);
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('click', this.onClick);
  }

  onClick(e) {
    if (!this.onPick) return;
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    let best = null, bd = 26;
    for (const a of this.actors.values()) {
      if (a.gone || a.dying) continue;
      const d = Math.hypot(a.x - x, a.y - 18 * (a.scale || 1) - y);
      if (d < bd) { bd = d; best = a; }
    }
    if (best) this.onPick(best.id, best.side);
  }

  // ----- sinkronisasi state dari server -----
  setBiome(name) {
    if (!BIOME[name]) name = 'plains';
    if (name === this.biome) return;
    this.biome = name;
    this.bg = buildBackdrop(name);
    const b = BIOME[name];
    this.decor = [];
    this.ambDirty = true;
    const add = async (id, x, y) => {
      try {
        const mod = await loadFx(id);
        if (this.biome === name) {
          this.decor.push(createFx(mod, { x, y, seed: Math.round(x) }));
          this.ambDirty = true;
        }
      } catch {}
    };
    if (!this.lowPower) for (const [id, x, y] of b.decor) add(id, x, y);
    if (b.weather && !this.preview && !this.lowPower && !this.reduced) add(b.weather, 160, 170);
    this.lamps = b.decor.map(([id, x, y]) => [x, y - (id === 'fire/torch' ? 24 : 10)]);
  }

  setLowPower(on) {
    if (this.lowPower === on) return;
    this.lowPower = on;
    const b = this.biome;
    this.biome = null;
    this.setBiome(b);
  }

  /** Muat efek yang kemungkinan dipakai saat browser senggang, supaya tidak tersendat saat pertama kali. */
  prefetch(ids) {
    const list = [...new Set(ids)].filter(Boolean);
    const idle = typeof requestIdleCallback === 'function' ? requestIdleCallback : (fn) => setTimeout(fn, 200);
    const next = () => {
      const id = list.shift();
      if (!id) return;
      loadFx(id).catch(() => {}).finally(() => idle(next));
    };
    idle(next);
  }

  syncHeroes(players) {
    const ids = new Set();
    players.filter((p) => p.character).forEach((p, i) => {
      const c = p.character, [hx, hy] = HERO_SLOTS[i % HERO_SLOTS.length];
      ids.add(p.id);
      const o = { id: p.id, side: 'hero', kind: 'humanoid', name: c.name, look: c.look, character: c, homeX: hx, homeY: hy, flip: false, hp: c.hp, maxHp: c.maxHp, status: c.status || {} };
      const a = this.actors.get(p.id);
      if (a) {
        a.update(o);
        if (!this.running) {
          a.down = c.hp <= 0;
          a.dead = !!c.death?.dead;
        }
      } else {
        const n = new Actor(o);
        n.down = c.hp <= 0;
        this.actors.set(p.id, n);
      }
    });
    for (const [id, a] of this.actors) if (a.side === 'hero' && !ids.has(id)) this.actors.delete(id);
  }

  syncEnemies(enemies = []) {
    if (this.running) {
      this.pendingEnemies = enemies;
      return;
    }
    this.pendingEnemies = null;
    const ids = new Set(enemies.map((e) => e.id));
    enemies.forEach((e, i) => this.upsertEnemy(e, i));
    for (const [id, a] of this.actors) if (a.side === 'enemy' && !ids.has(id) && !a.dying) this.actors.delete(id);
  }

  upsertEnemy(e, i) {
    const t = ENEMY_TYPES[e.type] || ENEMY_TYPES.bandit;
    const slot = typeof i === 'number' ? i : [...this.actors.values()].filter((a) => a.side === 'enemy').length;
    // bos besar berdiri di belakang-kanan; musuh lain di depannya
    const [ex, ey] = t.boss ? [262, 152] : ENEMY_SLOTS[slot % ENEMY_SLOTS.length];
    const o = { id: e.id, side: 'enemy', kind: e.type === 'dummy' ? 'dummy' : t.kind, type: e.type, name: e.name, maxHp: e.maxHp, homeX: ex, homeY: ey, flip: true, look: t.look, status: e.status || {}, boss: !!(t.boss || e.boss), scale: e.boss && !t.big && t.sprite !== 'dragon' ? 2 : 1 };
    if (!this.running) o.hp = e.hp;
    let a = this.actors.get(e.id);
    if (a) a.update(o);
    else {
      a = new Actor({ hp: e.hp, ...o });
      this.actors.set(e.id, a);
      if (a.kind === 'critter') this.attachCritter(a, t);
      if (a.kind === 'dummy') a.target = new Target(0, 5);
    }
    return a;
  }

  async attachCritter(a, t) {
    try {
      const mod = await loadFx(t.fx);
      a.critter = createFx(mod, { x: a.x, y: a.y, flip: true, seed: Math.round(a.phase * 100) });
      a.fly = t.fly || 0;
    } catch {}
  }

  // ----- antrean event -----
  enqueue(events) {
    this.queue.push(...events);
    if (!this.running) this.run();
  }

  async run() {
    this.running = true;
    while (this.queue.length && this.alive) {
      const ev = this.queue.shift();
      try {
        await this.handle(ev);
      } catch (e) {
        console.warn('[stage]', ev.kind, e);
      }
    }
    this.running = false;
    if (this.pendingEnemies) this.syncEnemies(this.pendingEnemies);
    for (const a of this.actors.values()) if (a.side === 'hero') a.down = a.hp <= 0;
  }

  async handle(ev) {
    const A = (id) => this.actors.get(id);
    switch (ev.kind) {
      case 'skill': {
        const caster = A(ev.actor);
        if (!caster) return;
        const skill = skillsFor(caster.character).find((s) => s.id === ev.skill);
        if (!skill) return;
        let target = ev.target ? A(ev.target) : null;
        if (!target && !skill.ally && skill.mode !== 'self') target = [...this.actors.values()].find((a) => a.side === 'enemy' && !a.dying);
        return this.perform(caster, skill, target, ev.results);
      }
      case 'hurt': {
        const target = A(ev.target);
        if (!target) return;
        if (typeof ev.hp === 'number') target.hp = ev.hp;
        const by = ev.by ? A(ev.by) : null;
        if (by && !by.dying) return this.attack(by, target, ev);
        this.spawnFx('impacts/hit-spark', target.x, target.y - 20, { flip: target.side === 'hero' });
        this.hurt(target, ev.amount, 2.2);
        return this.wait(0.55);
      }
      case 'heal': {
        const target = A(ev.target);
        if (!target) return;
        if (typeof ev.hp === 'number') target.hp = ev.hp;
        target.down = false;
        this.number(target, `+${ev.amount}`, 'heal');
        return this.playAct(target, await loadFx('holy/heal'), { onBody: true, maxTime: 1.6 });
      }
      case 'down': {
        const t = A(ev.target);
        this.sfx('down');
        if (t) {
          t.down = true;
          this.shake(0.25, 2);
        }
        return this.wait(0.5);
      }
      case 'die': {
        const t = A(ev.target);
        if (!t || t.dying) return;
        t.dying = true;
        t.hp = 0;
        this.sfx('die');
        if (t.kind === 'critter') {
          this.spawnFx('spawn/poof', t.x, t.y - (t.fly || 0));
          t.critter?.stop();
          await this.wait(0.7);
        } else await this.playAct(t, await loadFx('spawn/soul-rise'), { onBody: true, fadeBody: true });
        this.actors.delete(t.id);
        return;
      }
      case 'leave': {
        const t = A(ev.target);
        if (!t) return;
        t.dying = true;
        this.spawnFx('spawn/poof', t.x, t.y);
        await this.wait(0.35);
        this.actors.delete(t.id);
        return;
      }
      case 'spawn': {
        if (this.actors.has(ev.enemy.id)) return;
        const a = this.upsertEnemy(ev.enemy, ev.slot);
        this.sfx(ev.enemy.boss ? 'boss' : 'spawn');
        a.alpha = 0;
        this.spawnFx('spawn/poof', a.x, a.y);
        await this.wait(0.25);
        a.alpha = 1;
        return this.wait(0.35);
      }
      case 'biome':
        this.setBiome(ev.biome);
        return;
      case 'loot': {
        const t = A(ev.target) || A(ev.to);
        if (!t) return;
        this.sfx('coin');
        this.spawnFx('ui/coin-collect', t.x, t.y - 8);
        this.number(t, `+${ev.gold}G`, 'gold', 10);
        return this.wait(0.3);
      }
      case 'item': {
        const t = A(ev.target);
        if (!t) return;
        this.sfx(ev.rare ? 'rare' : 'item');
        this.spawnFx(ev.rare ? 'pickups/loot-beam' : 'pickups/collect-burst', t.x, t.y);
        return this.wait(ev.rare ? 0.9 : 0.4);
      }
      case 'quest': {
        this.sfx('quest');
        this.spawnFx('ui/quest-complete', W / 2, 60, { text: tr(this.lang, 'stage.quest') }, true);
        return this.wait(1.4);
      }
      case 'deathsave': {
        const t = A(ev.target);
        if (!t) return;
        if (typeof ev.hp === 'number') t.hp = ev.hp;
        const good = ev.result === 'ok' || ev.result === 'stable' || ev.result === 'revive';
        this.sfx(ev.result === 'dead' ? 'death' : good ? 'save' : 'fail');
        this.number(t, `${ev.d20}`, good ? 'heal' : 'dmg');
        if (ev.result === 'revive') {
          t.down = false;
          this.spawnFx('holy/heal', t.x, t.y);
        }
        if (ev.result === 'dead') {
          t.dead = true;
          this.spawnFx('spawn/soul-rise', t.x, t.y);
        }
        return this.wait(0.7);
      }
      case 'levelup': {
        const t = A(ev.target);
        if (!t) return;
        if (typeof ev.hp === 'number') t.hp = ev.hp;
        this.sfx('levelup');
        this.spawnFx('ui/level-up', t.x, t.y - 46, { text: tr(this.lang, 'stage.levelUp') }, true);
        return this.wait(0.9);
      }
      case 'stunned': {
        const t = A(ev.target);
        if (t) this.spawnFx('status/stunned', t.x, t.y - (t.kind === 'sprite' ? this.spriteOf(t).h - 6 : 0), { flip: t.flip }, false, 1.2);
        return this.wait(0.5);
      }
      default:
    }
  }

  wait(sec) {
    return new Promise((res) => {
      const end = this.time + sec;
      const check = () => (this.time >= end || !this.alive ? res() : setTimeout(check, 30));
      check();
    });
  }

  // ----- aksi -----
  /** Tampilkan hasil mekanik (kena/meleset/kritis/heal) di atas target. */
  showResults(results = []) {
    for (const r of results) {
      const t = this.actors.get(r.target);
      if (!t) continue;
      if (typeof r.hp === 'number') t.hp = r.hp;
      if (r.status) t.status = { ...(t.status || {}), [r.status]: 1 };
      if (r.heal) {
        t.down = false;
        this.sfx('heal');
        this.number(t, `+${r.amount}`, 'heal');
      } else if (r.miss) {
        this.sfx('miss');
        this.number(t, tr(this.lang, 'stage.miss'), 'miss');
        t.knockV += (t.side === 'hero' ? -1 : 1) * 60;
      } else {
        this.sfx(r.crit ? 'crit' : r.amount > 0 ? 'hit' : 'block');
        if (r.crit) {
          this.spawnFx('impacts/crit-hit', t.x, t.y - 20, { flip: t.side === 'hero' });
          this.spawnFx('ui/crit-number', t.x, t.y - 40 - (t.fly || 0), { text: `${r.amount}!`, label: tr(this.lang, 'stage.crit') }, true);
          this.shake(0.35, 3);
          this.flashT = 0.08;
        } else if (r.amount > 0) this.number(t, `-${r.amount}`, 'dmg');
        if (r.amount > 0) this.hurt(t, null, r.crit ? 3 : 1.5);
      }
    }
  }

  async perform(caster, skill, target, results) {
    const mod = await loadFx(skill.fx);
    this.sfx(skill.heal || skill.ally ? 'cast' : /arcane|fire|ice|holy|nature|shadow|lightning|status/.test(skill.fx) ? 'spell' : skill.fx.includes('arrow') ? 'bow' : 'swing');
    const dir = caster.flip ? -1 : 1;
    let shown = !results;
    const reveal = () => {
      if (shown) return;
      shown = true;
      this.showResults(results);
    };
    const missMain = results?.length && results[0].miss && results.every((r) => r.miss);
    if (skill.mode === 'act') {
      const dist = actDistance(mod);
      let standX = caster.x;
      if (target && target !== caster && dist) standX = Math.max(10, Math.min(W - 10, target.x - dir * dist));
      if (Math.abs(standX - caster.x) > 3) await this.walkTo(caster, standX);
      await this.playAct(caster, mod, { target: missMain ? null : target, x: standX, onHit: reveal, pseudoHit: true });
      reveal();
      if (Math.abs(caster.homeX - caster.x) > 3) await this.walkTo(caster, caster.homeX);
      return;
    }
    const recipient = skill.mode === 'self' ? caster : target || caster;
    const onBody = !!mod.act?.onBody;
    caster.casting = (mod.meta?.duration ?? 1.5) * 0.8;
    await this.playAct(recipient, mod, { onBody, x: recipient.x, flip: recipient.flip, poses: onBody, hitTarget: null, onHit: reveal, pseudoHit: true, maxTime: 2.4 });
    reveal();
    caster.casting = 0;
  }

  spriteOf(a) {
    return getSprite(a.sprite, 'idle0');
  }

  async attack(by, target, ev) {
    const T = ENEMY_TYPES[by.type] || {};
    let mod;
    try {
      mod = await loadFx(T.attack || 'melee/claw-swipe');
    } catch {
      mod = await loadFx('melee/claw-swipe');
    }
    const dir = by.flip ? -1 : 1, dist = actDistance(mod) || 44;
    const ranged = !!T.ranged;
    const standX = ranged ? by.x : Math.max(10, Math.min(W - 10, target.x - dir * dist));
    if (!ranged) await this.walkTo(by, standX);
    let shown = false;
    const reveal = () => {
      if (shown) return;
      shown = true;
      this.showResults([{ target: target.id, miss: ev.miss, crit: ev.crit, amount: ev.amount, hp: ev.hp }]);
    };
    by.attacking = true;
    this.sfx(T.ranged ? 'breath' : 'swing');
    const fxX = ranged ? by.x - this.spriteOf(by).w * 0.42 : standX;
    const fxY = ranged ? by.y - this.spriteOf(by).h * 0.68 : undefined;
    await this.playAct(by, mod, { target: ev.miss ? null : target, x: fxX, y: fxY, onHit: reveal, pseudoHit: true, maxTime: 1.8 });
    by.attacking = false;
    reveal();
    if (!ranged) await this.walkTo(by, by.homeX);
  }

  walkTo(actor, x) {
    return new Promise((resolve) => {
      if (Math.abs(actor.x - x) < 2) return resolve();
      actor.walk = { tx: x, resolve, faceBack: actor.flip !== x < actor.x };
    });
  }

  playAct(actor, mod, o = {}) {
    return new Promise((resolve) => {
      const a = mod.act ?? {}, meta = mod.meta ?? {}, D = meta.duration ?? 1;
      const usePoses = o.poses !== false && actor.kind === 'humanoid';
      const track = usePoses ? a.poses : null;
      const from = Math.min(0, track?.[0]?.[0] ?? 0);
      let to = meta.loop ? Math.min(D, 2) : Math.max(D, track?.[track.length - 1]?.[0] ?? 0);
      if (o.maxTime) to = Math.min(to, o.maxTime);
      const x = o.x ?? actor.x, flip = o.flip ?? actor.flip;
      const fx = createFx(mod, { x, y: o.y ?? actor.y, flip, seed: 1 + Math.floor(Math.random() * 999) });
      let hits = (a.hits ?? []).slice().sort((p, q) => p.t - q.t);
      if (!hits.length && o.pseudoHit) hits = [{ t: Math.min(D, to) * 0.45, stop: 0.06, shake: 0.12, amp: 1, push: 1.4 }];
      const ctl = { actor, mod, fx, track, t: from, to, D, hits, nh: 0, target: o.target ?? o.hitTarget ?? null, onHit: o.onHit, fadeBody: o.fadeBody, x, resolve, dir: flip ? -1 : 1 };
      if (track) actor.act = ctl;
      this.acts.push(ctl);
    });
  }

  hurt(target, amount, push = 2) {
    target.flash = 0.14;
    target.knockV += (target.side === 'hero' ? -1 : 1) * push * 30;
    if (target.target) target.target.hit({ push: push * 0.6, straw: 10 });
    if (amount != null) this.number(target, `-${amount}`, 'dmg');
  }

  number(target, text, kind, dy = 0) {
    const PAL = {
      heal: ['#06200c', '#0c3a16', '#147a2a', '#2ab44a', '#5ae07a', '#a2f2b2', '#dcffe4', '#ffffff'],
      miss: ['#101018', '#22222e', '#3a3a4a', '#5a5a6e', '#8a8aa0', '#b8b8c8', '#e0e0ea', '#ffffff'],
      gold: ['#2a1405', '#5c3008', '#9a5a0e', '#d48e18', '#f5b92c', '#ffde5e', '#fff4bc', '#ffffff'],
    };
    const top = (target.kind === 'sprite' ? this.spriteOf(target).h : 34) * (target.scale || 1);
    this.spawnFx('ui/damage-number', target.x, target.y - top - (target.fly || 0) - dy, { text, ...(PAL[kind] ? { palette: PAL[kind] } : {}) }, true);
  }

  async spawnFx(id, x, y, opts = {}, ui = false, ttl = 0) {
    try {
      const mod = await loadFx(id);
      this.effects.push({ fx: createFx(mod, { x, y, seed: 1 + Math.floor(Math.random() * 999), ...opts }), ui, ttl });
    } catch {}
  }

  shake(t, amp) {
    if (t > this.shakeT) {
      this.shakeT = this.shake0 = t;
      this.amp = amp;
    }
  }

  // ----- loop -----
  tick(now) {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (document.hidden || this.paused) return;
    // batasi FPS: 30 normal, 20 mode hemat. Pose pixelfx sendiri berganti di 12 fps, jadi tidak terasa patah.
    this.acc += dt;
    const step = 1 / (this.lowPower ? 20 : 30);
    if (this.acc < step) return;
    const d = Math.min(0.1, this.acc);
    this.acc = 0;
    const t0 = performance.now();
    this.update(d);
    this.render();
    this.stats.frames++;
    this.stats.ms += performance.now() - t0;
  }

  update(dt) {
    this.time += dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.freeze > 0) {
      this.freeze -= dt;
      return;
    }
    this.ambT += dt;
    if (this.ambT >= 1 / 15) {
      for (const d of this.decor) d.update(this.ambT);
      this.ambT = 0;
      this.ambDirty = true;
    }
    for (const e of this.effects) {
      e.fx.update(dt);
      if (e.ttl && (e.ttl -= dt) <= 0) {
        e.ttl = 0;
        e.fx.stop();
      }
    }
    this.effects = this.effects.filter((e) => !e.fx.done());
    if (this.flashT > 0) this.flashT -= dt;

    for (const c of this.acts.slice()) {
      const t0 = c.t;
      c.t += dt;
      if (c.t >= 0) c.fx.update(t0 < 0 ? c.t : dt);
      for (; c.nh < c.hits.length && c.hits[c.nh].t <= c.t; c.nh++) {
        const h = c.hits[c.nh];
        if (h.stop) this.freeze = Math.max(this.freeze, h.stop);
        if (h.shake) this.shake(h.shake, h.amp ?? 2);
        if (c.target && h.target !== false) this.hurt(c.target, null, h.push ?? 1.5);
        if (h.target !== false) c.onHit?.(h);
      }
      if (c.fadeBody) c.actor.alpha = actorAlphaOf(c.mod, Math.max(0, Math.min(c.t, c.D)), c.fx.options);
      if (c.t >= c.to && (c.mod.meta?.loop || c.fx.done())) {
        this.acts.splice(this.acts.indexOf(c), 1);
        if (c.actor.act === c) c.actor.act = null;
        c.resolve();
      }
    }

    for (const a of this.actors.values()) {
      if (a.flash > 0) a.flash -= dt;
      if (a.casting > 0) a.casting -= dt;
      a.knockV += (-90 * a.knock - 12 * a.knockV) * dt;
      a.knock += a.knockV * dt;
      if (a.walk) {
        const d = a.walk.tx - a.x, step = 230 * dt;
        if (Math.abs(d) <= step) {
          a.x = a.walk.tx;
          const r = a.walk.resolve;
          a.walk = null;
          r();
        } else a.x += Math.sign(d) * step;
      }
      if (a.critter) {
        a.critter.update(dt);
        a.critter.options.x = a.x + a.knock;
        a.critter.options.y = a.y - (a.fly || 0);
      }
      if (a.target) a.target.step(dt);
    }
  }

  render() {
    const f = this.frame;
    if (this.ambDirty) {
      clearFrame(this.amb);
      for (const d of this.decor) d.draw(this.amb);
      this.ambDirty = false;
    }
    // mulai dari lapisan suasana yang sudah jadi: cuma menyalin typed array, jauh lebih murah daripada menggambar ulang
    f.color.set(this.amb.color);
    f.light.set(this.amb.light);
    for (const c of this.acts) if (c.t >= 0) c.fx.draw(f, 'back');
    const list = [...this.actors.values()].filter((a) => !a.gone).sort((p, q) => p.y - q.y);
    for (const a of list) this.drawActor(a);
    for (const c of this.acts) if (c.t >= 0) c.fx.draw(f, 'front');
    if (!this.lowPower && this.lamps?.length) {
      const p = painterFor(f).place(0, 0, false, 0);
      for (const [lx, ly] of this.lamps) p.glow(lx, ly, 10 + Math.round(Math.sin(this.time * 9 + lx) * 1.5 + Math.sin(this.time * 23) * 0.8), hex('#ff9a3a'), 0.35);
    }
    for (const e of this.effects) if (!e.ui) e.fx.draw(f);
    this.drawUi();
    for (const e of this.effects) if (e.ui) e.fx.draw(f);
    composite(f, this.img.data, this.bg, this.flashT > 0 ? 2.2 : 1);
    let sx = 0, sy = 0;
    if (this.shakeT > 0 && !this.reduced) {
      const k = this.amp * (this.shakeT / this.shake0), fr = Math.floor(this.shakeT * 60);
      sx = Math.round(Math.sin(fr * 2.4) * k);
      sy = Math.round(Math.cos(fr * 3.7) * k * 0.7);
    }
    if (sx || sy) {
      this.ctx.fillStyle = '#0c0a09';
      this.ctx.fillRect(0, 0, W, H);
    }
    this.ctx.putImageData(this.img, sx, sy);
  }

  drawActor(a) {
    const f = this.frame;
    const X = Math.round(a.x + a.knock), Y = Math.round(a.y);
    if (a.kind === 'critter') {
      a.critter?.draw(f);
      return;
    }
    if (a.kind === 'sprite') {
      const frame = a.attacking ? 'attack' : Math.floor(this.time * (a.sprite === 'dragon' ? 2.5 : 3) + a.phase) & 1 ? 'idle1' : 'idle0';
      const sp = getSprite(a.sprite, frame);
      const lunge = a.attacking ? -10 : 0;
      drawSprite(f, sp, X + (a.flip ? lunge : -lunge), Y, a.flip, a.alpha, a.flash > 0 ? 0.7 : 0, a.dying && !a.act ? 0.55 : 0, a.scale || 1);
      return;
    }
    if (a.kind === 'dummy') {
      a.target?.draw(f.color, W, H, X, Y, true);
      a.target?.drawStraw(f.color, W, H, X, Y, true);
      return;
    }
    let q;
    let flip = a.flip;
    if (a.act?.track) {
      const c = a.act;
      q = poseAt(c.track, Math.max(c.track[0][0], Math.min(c.t, c.track[c.track.length - 1][0])));
      if (!q.weapon && a.weapon && a.weapon !== 'none' && !c.mod.act?.poses?.some((p) => p[1]?.weapon)) q = { ...q, weapon: a.weapon };
    } else if (a.walk) {
      q = walkPose(a, this.time);
      if (a.walk.faceBack) flip = !flip;
    } else q = idlePose(a, this.time);
    const bx = a.act ? Math.round(a.act.x) : X;
    const ox = Math.round(q.x ?? 0), oy = Math.round(q.y ?? 0);
    const BX = bx + (flip ? -ox : ox) + (a.act ? Math.round(a.knock) : 0), BY = Y + oy;
    // bayangan
    const hw = 9;
    for (let dy = 0; dy < 2; dy++)
      for (let x = -hw + dy * 2; x <= hw - dy * 2; x++) {
        const px = bx + (flip ? -ox : ox) + x, py = Y + dy;
        if (px < 0 || px >= W || py >= H) continue;
        const i = py * W + px;
        f.color[i] = (f.color[i] & 0xffffff) | (Math.max(f.color[i] >>> 24, 110) << 24);
      }
    if (a.boss && !this.lowPower) painterFor(f).place(0, 0, false, 0).glow(BX, BY - 30 * (a.scale || 1), 26, hex('#c03050'), 0.28);
    drawBody(f, q, a.palette, BX, BY, flip, a.dead ? 0.4 : a.status?.hidden ? Math.min(a.alpha, 0.45) : a.alpha, a.flash > 0 ? 0.7 : 0, a.down || (a.dying && !a.act) ? 0.55 : 0, a.scale || 1);
  }

  drawUi() {
    const p = painterFor(this.frame).place(0, 0, false, 0);
    for (const a of this.actors.values()) {
      if (a.side !== 'enemy' || a.dying || a.kind === 'dummy') continue;
      const top = a.y - (a.kind === 'critter' ? 30 + (a.fly || 0) : (a.kind === 'sprite' ? this.spriteOf(a).h + 6 : 44) * (a.scale || 1));
      if (a.status?.stun) for (let k = 0; k < 3; k++) {
        const ang = this.time * 4 + (k * Math.PI * 2) / 3;
        p.rect(Math.round(a.homeX + Math.cos(ang) * 7), Math.round(top - 4 + Math.sin(ang) * 2), 1, 1, hex('#ffe04a'));
      }
      if (a.status?.weak) p.text('v', a.homeX + 13, top - 2, hex('#7ab8ff'), { outline: INK });
      if (a.boss) {
        const bw = 180, bx0 = (W - bw) >> 1, kk = Math.max(0, Math.min(1, a.hp / Math.max(1, a.maxHp)));
        p.text(String(a.name || 'BOSS').toUpperCase(), W / 2, 4, hex('#f6dfa4'), { align: 'center', outline: INK });
        p.rect(bx0 - 1, 11, bw + 2, 6, INK);
        p.rect(bx0, 12, bw, 4, hex('#3a1414'));
        p.rect(bx0, 12, Math.round(bw * kk), 4, hex('#d0473f'));
        p.rect(bx0, 12, Math.round(bw * kk), 1, hex('#ff8a6a'));
        continue;
      }
      const w = 22, x0 = Math.round(a.homeX - w / 2), k = Math.max(0, Math.min(1, a.hp / Math.max(1, a.maxHp)));
      p.rect(x0 - 1, top - 1, w + 2, 4, INK);
      p.rect(x0, top, w, 2, hex('#3a1414'));
      p.rect(x0, top, Math.round(w * k), 2, k > 0.5 ? hex('#d0473f') : hex('#f08a3c'));
      if (this.highlight === a.id) {
        const bob = Math.floor(this.time * 4) & 1;
        p.tri(a.homeX - 3, top - 7 + bob, a.homeX + 3, top - 7 + bob, a.homeX, top - 3 + bob, hex('#f6dfa4'));
      }
      if (this.highlight === a.id || this.showNames) p.text(String(a.name || '').toUpperCase().slice(0, 14), a.homeX, top - 7 - (this.highlight === a.id ? 7 : 0), hex('#ecdfc4'), { align: 'center', outline: INK });
    }
    for (const a of this.actors.values()) {
      if (a.side !== 'hero' || !a.status?.shield) continue;
      const cx = Math.round(a.x), cy = a.y - 20;
      for (let k = 0; k < 24; k++) {
        const ang = (k / 24) * Math.PI * 2 + this.time;
        if (k % 3 === 0) continue;
        p.light(Math.round(cx + Math.cos(ang) * 13), Math.round(cy + Math.sin(ang) * 20), hex('#ffe08a'), 0.5);
      }
    }
    if (this.highlight) {
      const h = this.actors.get(this.highlight);
      if (h && h.side === 'hero') {
        const top = h.y - 46, bob = Math.floor(this.time * 4) & 1;
        p.tri(h.x - 3, top + bob, h.x + 3, top + bob, h.x, top + 4 + bob, hex('#7cbf73'));
      }
    }
  }
}

function actDistance(mod) {
  const a = mod.act;
  return a?.target?.x ?? a?.targets?.[0]?.x ?? 0;
}

/** Gambar tubuh rig dengan palet kustom. */
function drawBody(f, q, pal, BX, BY, flip, alpha = 1, flash = 0, gray = 0, k = 1) {
  if (alpha <= 0.02) return;
  const r = posed(q);
  const C = f.color, L = f.light;
  for (let i = 0; i < r.n; i++) {
    const px0 = flip ? BX - (r.xs[i] + 1) * k : BX + r.xs[i] * k, py0 = BY + (r.ys[i] + 1) * k - 1 - (k - 1);
    for (let by = 0; by < k; by++) for (let bx = 0; bx < k; bx++) {
    const px = px0 + bx, py = py0 + by;
    if (px < 0 || py < 0 || px >= W || py >= H) continue;
    if (alpha < 1 && BAYER[((py & 3) << 2) | (px & 3)] / 16 >= alpha) continue;
    const tone = r.tone[i];
    let c;
    if (tone === 255 || tone === 252 || !pal) c = r.color[i];
    else {
      const ramp = pal.byPart[r.part[i]] || pal.byPart[3];
      if (tone === 254) c = mix(ramp[3], INK, 0.35);
      else if (tone === 253) c = pal.mark;
      else c = ramp[Math.min(3, (tone & 3) + (tone >= 4 ? 1 : 0))];
    }
    if (gray) c = mix(c, GRAY, gray);
    if (flash) c = mix(c, WHITE, flash);
    const j = py * W + px;
    C[j] = c;
    L[j] = 0;
    }
  }
}

/** Salin sprite-kode ke frame (kaki di Y, tengah di X). */
function drawSprite(f, sp, X, Y, flip, alpha = 1, flash = 0, gray = 0, k = 1) {
  if (alpha <= 0.02) return;
  const C = f.color, x0 = Math.round(X - (sp.w * k) / 2), y0 = Math.round(Y - sp.h * k + 1);
  // bayangan
  for (let dy = 0; dy < 2; dy++)
    for (let x = 2 + dy * 2; x < sp.w * k - 2 - dy * 2; x++) {
      const px = x0 + x, py = Y + dy;
      if (px < 0 || px >= W || py >= H || py < 0) continue;
      const i = py * W + px;
      C[i] = (C[i] & 0xffffff) | (Math.max(C[i] >>> 24, 110) << 24);
    }
  for (let y = 0; y < sp.h * k; y++)
    for (let x = 0; x < sp.w * k; x++) {
      const sx = (x / k) | 0, sy = (y / k) | 0;
      let c = sp.px[sy * sp.w + (flip ? sp.w - 1 - sx : sx)];
      if (!c) continue;
      const px = x0 + x, py = y0 + y;
      if (px < 0 || py < 0 || px >= W || py >= H) continue;
      if (alpha < 1 && BAYER[((py & 3) << 2) | (px & 3)] / 16 >= alpha) continue;
      if (gray) c = mix(c, GRAY, gray);
      if (flash) c = mix(c, WHITE, flash);
      C[py * W + px] = c;
      f.light[py * W + px] = 0;
    }
}

/** Potret diam (idle) satu karakter ke kanvas kecil, latar transparan. */
export function drawPortrait(canvas, look, { w = 36, h = 46 } = {}) {
  canvas.width = w;
  canvas.height = h;
  const f = createFrame(w, h);
  const q = withWeapon({ ...READY }, look?.weapon);
  const pal = paletteOf(look);
  const r = posed(q);
  const BX = Math.round(w / 2) - 2, BY = h - 2;
  for (let i = 0; i < r.n; i++) {
    const px = BX + r.xs[i], py = BY + r.ys[i];
    if (px < 0 || py < 0 || px >= w || py >= h) continue;
    const tone = r.tone[i];
    let c;
    if (tone === 255 || tone === 252) c = r.color[i];
    else {
      const ramp = pal.byPart[r.part[i]] || pal.byPart[3];
      c = tone === 254 ? mix(ramp[3], INK, 0.35) : tone === 253 ? pal.mark : ramp[Math.min(3, (tone & 3) + (tone >= 4 ? 1 : 0))];
    }
    f.color[py * w + px] = c;
  }
  const img = new ImageData(w, h);
  composite(f, img.data, null);
  canvas.getContext('2d').putImageData(img, 0, 0);
}

// Monster sebagai kode, gaya claude-pxl: primitif (ellipse, rect, garis, poligon) → bayangan otomatis
// (terang di atas, gelap di bawah) → outline tinta otomatis → detail (mata, gigi). Semua menghadap kanan;
// engine mencerminkannya. Frame: idle0, idle1, attack. Hasil di-cache, jadi biaya per frame cuma menyalin piksel.

const hexToNum = (h) => {
  const v = parseInt(h.slice(1), 16);
  return (255 << 24) | ((v & 255) << 16) | (((v >> 8) & 255) << 8) | ((v >> 16) & 255);
};
const INK = hexToNum('#120d16');

class Px {
  constructor(w, h) {
    Object.assign(this, { w, h, m: new Int16Array(w * h).fill(-1), d: new Uint32Array(w * h) });
  }
  set(x, y, mat) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.m[y * this.w + x] = mat;
  }
  ellipse(cx, cy, rx, ry, mat) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.5), dy = (y - cy) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1) this.set(x, y, mat);
      }
    return this;
  }
  rect(x, y, w, h, mat) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, mat);
    return this;
  }
  line(x0, y0, x1, y1, mat, r = 0) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      if (r <= 0) this.set(x, y, mat);
      else this.ellipse(x, y, r, r, mat);
    }
    return this;
  }
  poly(pts, mat) {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, mat);
    }
    return this;
  }
  dot(x, y, hex) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = hexToNum(hex);
    return this;
  }
  /** Bayangan + outline → { w, h, px: Uint32Array (0 = kosong) }. mats: [[terang, tengah, gelap], ...] */
  finish(mats) {
    const { w, h, m, d } = this;
    const ramps = mats.map((r) => r.map(hexToNum));
    const px = new Uint32Array(w * h);
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : m[y * w + x]);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const k = m[y * w + x];
        if (k < 0) continue;
        let up = 0, dn = 0;
        while (up < 3 && at(x, y - up - 1) === k) up++;
        while (dn < 3 && at(x, y + dn + 1) === k) dn++;
        const tone = up === 0 ? 0 : dn === 0 || (dn === 1 && up >= 3) ? 2 : 1;
        px[y * w + x] = ramps[k][tone];
      }
    for (let i = 0; i < w * h; i++) if (d[i]) px[i] = d[i];
    const out = new Uint32Array(w * h);
    out.set(px);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (px[y * w + x]) continue;
        const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && px[yy * w + xx];
        if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out[y * w + x] = INK;
      }
    return { w, h, px: out };
  }
}

// ---------------- monster ----------------
const FUR = ['#b9c2d3', '#7d889f', '#4f5870'];
const FUR_D = ['#5d667c', '#454d61', '#323849'];
const BELLY = ['#c9d0de', '#a9b2c4', '#8a93a8'];

function wolf(frame) {
  const g = new Px(36, 22), b = frame === 'idle1' ? 1 : 0, atk = frame === 'attack';
  const s = atk ? 2 : 0; // condong ke depan saat menerkam
  // kaki jauh (lebih gelap) dulu
  g.line(12, 14 + b, 12 - (atk ? 2 : 0), 20, 1, 0.8).line(24 + s, 13 + b, 25 + s + (atk ? 3 : 0), 20, 1, 0.8);
  g.line(5, 11 + b, 1, 5 + b, 0, 1.2).line(1, 5 + b, 0, 2 + b, 0, 0.6); // ekor
  g.ellipse(14, 11 + b, 9, 4, 0); // badan
  g.ellipse(22 + s, 10 + b, 4.5, 5, 0); // dada
  g.ellipse(27 + s, 6 + b, 4, 3.2, 0); // kepala
  g.rect(29 + s, 6 + b, 5, 2, 0); // moncong
  g.rect(29 + s, atk ? 10 + b : 8 + b, 4, 1, 0); // rahang
  g.poly([[24 + s, 4 + b], [25 + s, 0 + b], [27 + s, 4 + b]], 0).poly([[27 + s, 4 + b], [28 + s, 1 + b], [29 + s, 4 + b]], 0); // telinga
  g.ellipse(15, 14.5 + b, 5, 0.6, 2); // perut
  g.line(9, 13 + b, 8, 20, 0, 0.8).line(21 + s, 13 + b, 22 + s + (atk ? 4 : 0), 20, 0, 0.8); // kaki dekat
  const px = g.finish([FUR, FUR_D, BELLY]);
  const G = new Px(36, 22);
  G.m.set(g.m);
  G.dot(28 + s, 5 + b, '#ff4a3a').dot(33 + s, 6 + b, '#1a1418').dot(29 + s, 5 + b, '#2a0a0a');
  if (atk) for (const x of [30, 32]) G.dot(x + s, 8 + b, '#f6f2e8').dot(x + 1 + s, 9 + b, '#f6f2e8');
  G.dot(8, 20, '#2a2230').dot(22 + s + (atk ? 4 : 0), 20, '#2a2230');
  return mergeDetails(px, G);
}

function spider(frame) {
  const g = new Px(38, 22), up = frame === 'idle1' ? 1 : 0, atk = frame === 'attack', lift = atk ? 3 : 0;
  // kaki: dua segmen 1 px, lutut tinggi di atas badan, kaki menyebar lebar → siluet laba-laba yang jelas
  const leg = (mat, hipX, kneeX, kneeY, footX, footY) => g.line(hipX, 12 - lift, kneeX, kneeY, mat, 0).line(hipX + 1, 12 - lift, kneeX + 1, kneeY, mat, 0).line(kneeX, kneeY, footX, footY, mat, 0);
  const far = [[15, 9, 4, 4, 21], [17, 15, 3, 12, 21], [19, 22, 3, 24, 21], [21, 27, 5, 33, 21]];
  const near = [[14, 6, 3, 1, 21], [16, 12, 2, 9, 21], [19, 24, 2, 27, 21], [22, 30, 4, 36, 21]];
  far.forEach(([h, kx, ky, fx, fy], i) => leg(1, h, kx, ky + ((i + up) % 2), fx, fy));
  g.ellipse(10, 12 - lift / 2, 7, 5, 0); // perut
  g.ellipse(20, 13 - lift, 4, 3, 0); // kepala-dada
  near.forEach(([h, kx, ky, fx, fy], i) => (atk && i === 3 ? leg(2, h, 30, 2, 36, 8) : leg(2, h, kx, ky + ((i + 1 + up) % 2), fx, fy)));
  const px = g.finish([['#8a6aaa', '#4a3364', '#2c1e3e'], ['#4a3a5c', '#3a2a4c', '#2a1e38'], ['#7a5a9a', '#5a4478', '#3a2a50']]);
  const G = new Px(38, 22);
  G.dot(22, 12 - lift, '#ff3b30').dot(23, 12 - lift, '#ff3b30').dot(23, 13 - lift, '#ffb04a').dot(21, 12 - lift, '#ff3b30');
  for (const [x, y] of [[9, 9], [10, 10], [11, 9], [10, 11], [9, 13], [10, 12], [11, 13]]) G.dot(x, y - lift / 2, '#e0402e');
  if (atk) G.dot(24, 15 - lift, '#f6f2e8').dot(24, 16 - lift, '#f6f2e8').dot(23, 16 - lift, '#f6f2e8');
  return mergeDetails(px, G);
}

function mimic(frame) {
  const g = new Px(30, 26), atk = frame === 'attack', hop = frame === 'idle1' ? 1 : 0;
  const lidY = atk ? 1 : 8 - hop;
  if (atk) {
    g.rect(4, 10, 18, 5, 2); // mulut gelap
    g.line(16, 12, 28, 9, 3, 1.2).line(28, 9, 29, 11, 3, 1); // lidah
  }
  g.rect(3, 14, 20, 11, 0); // badan peti
  g.ellipse(13, lidY + 2, 10, 2.5, 0).rect(3, lidY + 2, 20, 4, 0); // tutup
  g.rect(3, 14, 20, 1, 1).rect(3, lidY + 5, 20, 1, 1); // pita logam
  g.rect(3, 14, 1, 11, 1).rect(22, 14, 1, 11, 1).rect(3, lidY + 1, 1, 5, 1).rect(22, lidY + 1, 1, 5, 1);
  g.rect(12, 13, 2, 4, 1); // gembok
  const px = g.finish([['#c08850', '#8a5a32', '#5a3820'], ['#ffe08a', '#d9a94e', '#8f6522'], ['#5a1020', '#3a0812', '#200408'], ['#ff9ab0', '#e0607a', '#a03050']]);
  const G = new Px(30, 26);
  if (atk) {
    for (let x = 5; x < 22; x += 3) G.dot(x, 14, '#f6f2e8').dot(x + 1, 13, '#f6f2e8').dot(x, lidY + 6, '#f6f2e8').dot(x + 1, lidY + 7, '#f6f2e8');
    G.dot(9, 11, '#ffd84a').dot(15, 11, '#ffd84a');
  } else G.dot(8, lidY + 6, '#ffd84a').dot(17, lidY + 6, '#ffd84a'); // mata mengintip dari celah
  G.dot(12, 15, '#1a1418').dot(13, 15, '#1a1418');
  return mergeDetails(px, G);
}

function dragon(frame) {
  const g = new Px(80, 54), atk = frame === 'attack', wingUp = frame !== 'idle1';
  const hx = atk ? 4 : 0, hy = atk ? 3 : 0; // kepala menyodok saat menyembur
  // sayap jauh
  if (wingUp) g.poly([[30, 26], [22, 2], [33, 8], [42, 6], [44, 24]], 1);
  else g.poly([[30, 26], [14, 30], [24, 34], [36, 36], [44, 28]], 1);
  // kaki jauh, ekor
  g.line(24, 38, 22, 52, 4, 2).line(38, 38, 40, 52, 4, 2);
  g.line(18, 34, 9, 38, 0, 3).line(9, 38, 3, 45, 0, 2).line(3, 45, 0, 42, 0, 1).poly([[0, 40], [-2, 46], [4, 46]], 0);
  // badan & leher & kepala
  g.ellipse(31, 32, 15, 9, 0);
  g.ellipse(32, 37, 11, 3.5, 2);
  g.line(42, 28, 52 + hx, 16 + hy, 0, 3.5);
  g.ellipse(57 + hx, 13 + hy, 6.5, 4.5, 0);
  g.rect(60 + hx, 12 + hy, 9, 4, 0);
  g.rect(60 + hx, atk ? 19 + hy : 16 + hy, 8, 2, 0);
  g.line(54 + hx, 9 + hy, 48 + hx, 3 + hy, 3, 1).line(57 + hx, 9 + hy, 54 + hx, 2 + hy, 3, 0.7);
  for (let i = 0; i < 4; i++) g.poly([[22 + i * 6, 24 - (i % 2)], [25 + i * 6, 19 - (i % 2)], [27 + i * 6, 24]], 0); // duri punggung
  // kaki dekat
  g.line(27, 39, 26, 52, 0, 2.2).line(40, 38, 43, 52, 0, 2.2);
  // sayap dekat
  if (wingUp) {
    g.poly([[34, 26], [28, 0], [38, 5], [48, 4], [50, 24]], 1);
    g.line(34, 26, 28, 0, 0, 0.8).line(34, 26, 38, 5, 0, 0.6).line(34, 26, 48, 4, 0, 0.6);
  } else {
    g.poly([[34, 26], [18, 36], [30, 40], [42, 41], [50, 30]], 1);
    g.line(34, 26, 18, 36, 0, 0.8).line(34, 26, 30, 40, 0, 0.6).line(34, 26, 42, 41, 0, 0.6);
  }
  const px = g.finish([
    ['#ff6a4a', '#c8322a', '#7a1a1e'],
    ['#b8404a', '#7a2030', '#4a1220'],
    ['#ffe08a', '#e0a840', '#a06a20'],
    ['#f4ecd8', '#cfc4a8', '#8f8670'],
    ['#8a2a28', '#5a1a1c', '#3a1012'],
  ]);
  const G = new Px(80, 54);
  G.dot(58 + hx, 11 + hy, '#ffe04a').dot(59 + hx, 11 + hy, '#1a0a0a').dot(67 + hx, 12 + hy, '#2a0a0a');
  if (atk) for (let x = 61; x < 68; x += 2) G.dot(x + hx, 16 + hy, '#f6f2e8').dot(x + hx, 18 + hy, '#ffb04a');
  for (const x of [25, 27, 42, 44]) G.dot(x, 52, '#f4ecd8');
  return mergeDetails(px, G);
}

function mushroom(frame) {
  const g = new Px(26, 28), bob = frame === 'idle1' ? 1 : 0, atk = frame === 'attack';
  const lean = atk ? 2 : 0;
  // kaki & batang
  g.rect(9, 22, 3, 5, 1).rect(14, 22, 3, 5, 1);
  g.ellipse(13, 17 + bob, 5.5, 6, 1);
  // lengan kecil
  g.line(8, 16 + bob, 4 + (atk ? 6 : 0), 19 + bob - (atk ? 3 : 0), 1, 0.7).line(18, 16 + bob, 22, 19 + bob, 1, 0.7);
  // tudung
  g.ellipse(13 + lean, 8 + bob, 11, 6.5, 0);
  g.rect(3 + lean, 9 + bob, 21, 3, 0);
  const px = g.finish([['#ff7a6a', '#d0473f', '#8a2a28'], ['#f4ecd8', '#d8ccb0', '#a89a7a']]);
  const G = new Px(26, 28);
  for (const [x, y] of [[8, 5], [15, 4], [19, 8], [11, 9], [5, 9]]) G.dot(x + lean, y + bob, '#fff4e0').dot(x + 1 + lean, y + bob, '#fff4e0');
  G.dot(11, 16 + bob, '#1a1418').dot(15, 16 + bob, '#1a1418');
  if (atk) G.dot(13, 19 + bob, '#5a2a20').dot(14, 19 + bob, '#5a2a20');
  return mergeDetails(px, G);
}

function golem(frame) {
  const g = new Px(48, 50), atk = frame === 'attack', b = frame === 'idle1' ? 1 : 0;
  const armY = atk ? -10 : 0;
  // kaki
  g.ellipse(17, 42, 5, 7, 1).ellipse(31, 42, 5, 7, 1);
  // badan bongkah
  g.ellipse(24, 27 + b, 13, 12, 0);
  g.ellipse(24, 12 + b, 8, 7, 0); // kepala
  // lengan raksasa
  g.ellipse(9, 28 + b + armY, 5.5, 9, 1).ellipse(39, 28 + b, 5.5, 9, 1);
  g.ellipse(8, 38 + b + armY, 6, 4.5, 1).ellipse(40, 38 + b, 6, 4.5, 1);
  // lumut
  g.ellipse(22, 17 + b, 6, 2, 2).ellipse(31, 22 + b, 4, 1.5, 2).ellipse(15, 33 + b, 3, 1.2, 2).ellipse(24, 6 + b, 4, 1.4, 2);
  const px = g.finish([['#9aa0a8', '#6a707a', '#41454e'], ['#80868e', '#565c66', '#383b44'], ['#8ad06a', '#5a9a46', '#346a2a']]);
  const G = new Px(48, 50);
  G.dot(21, 12 + b, '#7af6ff').dot(22, 12 + b, '#7af6ff').dot(26, 12 + b, '#7af6ff').dot(27, 12 + b, '#7af6ff');
  for (const [x, y] of [[24, 27], [23, 28], [25, 28], [24, 29]]) G.dot(x, y + b, atk ? '#ffffff' : '#5ae8f0');
  // retakan batu supaya terbaca sebagai bongkahan, bukan gumpalan
  for (const [x, y] of [[17, 22], [18, 23], [18, 24], [19, 25], [30, 30], [31, 31], [31, 32], [20, 34], [21, 35], [27, 36], [28, 36], [22, 8], [23, 9], [7, 26], [8, 27], [40, 30], [40, 31]])
    G.dot(x, y + b + (x < 12 ? armY : 0), '#2e3138');
  return mergeDetails(px, G);
}

function mergeDetails(base, G) {
  const out = base.px;
  for (let i = 0; i < G.d.length; i++) if (G.d[i] && out[i]) out[i] = G.d[i];
  return base;
}

const BUILD = { wolf, spider, mimic, dragon, mushroom, golem };
const cache = new Map();

/** Sprite monster: { w, h, px } dengan kaki di baris terbawah, tengah = w/2. */
export function getSprite(name, frame = 'idle0') {
  const key = `${name}:${frame}`;
  let s = cache.get(key);
  if (!s) {
    s = (BUILD[name] || wolf)(frame);
    cache.set(key, s);
  }
  return s;
}

export const SPRITE_NAMES = Object.keys(BUILD);

'use client';
import { memo, useMemo } from 'react';

// Avatar piksel 16×16 yang digambar dari nama + peran NPC (tanpa file gambar).
// Nama yang sama selalu menghasilkan wajah yang sama; peran menentukan aksesori kepala.
const cache = new Map();

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const SKIN = ['#f1c9a5', '#e0ac7e', '#c68b59', '#a26a42', '#7a4b2e'];
const HAIR = ['#2b1d14', '#4a2f1d', '#7b4a24', '#b07a3a', '#d8c27a', '#8c8c8c', '#c94c2e', '#1f2a44'];
const CLOTH = ['#7c3a2d', '#2f5d50', '#3c4f86', '#6b4c8a', '#8a6a2f', '#4a4a4a'];

const has = (re, s) => re.test(s.toLowerCase());
function kindOf(name, role) {
  const s = `${name} ${role}`;
  if (has(/goblin|orc|ork|troll/, s)) return { skin: '#7fb069' };
  if (has(/lich|zombie|hantu|ghost|skeleton|tengkorak|mayat|arwah|undead|wraith/, s)) return { skin: '#b9c4c9', eyes: '#7ee0ff' };
  if (has(/naga|dragon|kadal|lizard/, s)) return { skin: '#c0583a' };
  return {};
}
function hatOf(name, role) {
  const s = `${name} ${role}`;
  if (has(/raja|ratu|king|queen|pangeran|putri|prince|princess|maharani|kaisar|emperor|sultan/, s)) return 'crown';
  if (has(/prajurit|penjaga|kapten|guard|soldier|captain|ksatria|knight|jenderal|general|sersan|sergeant/, s)) return 'helmet';
  if (has(/penyihir|witch|wizard|mage|dukun|shaman|nenek sihir|sorcer/, s)) return 'wizard';
  if (has(/pencuri|thief|rogue|mata-mata|spy|pemberontak|rebel|assassin|pembunuh|bandit/, s)) return 'hood';
  if (has(/pedagang|merchant|saudagar|juragan|pemilik|keeper|kedai|tavern|nelayan|fisher|petani|farmer/, s)) return 'cap';
  if (has(/biksu|monk|pendeta|priest|imam|resi|pertapa|hermit/, s)) return 'bald';
  return null;
}

function draw(name, role) {
  const h = hash(name);
  const k = kindOf(name, role);
  const skin = k.skin || SKIN[h % SKIN.length];
  const hair = HAIR[(h >>> 4) % HAIR.length];
  const cloth = CLOTH[(h >>> 8) % CLOTH.length];
  const hat = hatOf(name, role);
  const elder = has(/tetua|elder|lurah|kakek|nenek|tua|old|ki |mpu|datuk|resi/, `${name} ${role} `);
  const beard = elder || (h >>> 12) % 4 === 0;
  const longHair = !beard && (h >>> 14) % 2 === 0;

  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  const px = (x, y, col, w = 1, hh = 1) => {
    g.fillStyle = col;
    g.fillRect(x, y, w, hh);
  };
  // bahu / baju
  px(3, 13, cloth, 10, 3);
  px(2, 14, cloth, 12, 2);
  // leher + wajah
  px(6, 11, skin, 4, 2);
  px(4, 4, skin, 8, 8);
  px(5, 12, skin, 6, 1);
  // bayangan sisi kanan wajah
  g.globalAlpha = 0.18;
  px(11, 5, '#000', 1, 6);
  g.globalAlpha = 1;
  // rambut
  if (hat !== 'bald') {
    px(4, 3, hair, 8, 2);
    px(3, 4, hair, 1, longHair ? 8 : 3);
    px(12, 4, hair, 1, longHair ? 8 : 3);
    if ((h >>> 16) % 2) px(5, 5, hair, 3, 1); // poni
  }
  // mata + alis + mulut
  const eye = k.eyes || '#1a1210';
  px(6, 7, eye);
  px(9, 7, eye);
  px(6, 6, hair === skin ? '#000' : hair, 2, 1);
  px(9, 6, hair === skin ? '#000' : hair, 1, 1);
  px(7, 10, '#6b2b24', 2, 1);
  if (beard) {
    const b = elder ? '#d8d8d8' : hair;
    px(5, 9, b, 6, 2);
    px(6, 11, b, 4, 2);
    px(7, 10, '#6b2b24', 2, 1);
  }
  // aksesori kepala sesuai peran
  if (hat === 'crown') {
    px(4, 2, '#e8b64c', 8, 2);
    px(4, 1, '#e8b64c');
    px(7, 0, '#e8b64c', 2, 2);
    px(11, 1, '#e8b64c');
    px(7, 2, '#d0473f', 2, 1);
  } else if (hat === 'helmet') {
    px(3, 2, '#9aa3ad', 10, 3);
    px(4, 1, '#9aa3ad', 8, 1);
    px(3, 5, '#7b838c', 1, 3);
    px(12, 5, '#7b838c', 1, 3);
    px(7, 5, '#7b838c', 2, 3);
  } else if (hat === 'wizard') {
    px(2, 4, '#4b3a7a', 12, 1);
    px(4, 2, '#4b3a7a', 8, 2);
    px(6, 0, '#4b3a7a', 4, 2);
    px(9, 0, '#e8b64c');
  } else if (hat === 'hood') {
    px(3, 2, '#3a3a44', 10, 3);
    px(2, 4, '#3a3a44', 2, 9);
    px(12, 4, '#3a3a44', 2, 9);
    px(4, 5, 'rgba(0,0,0,.35)', 8, 1);
  } else if (hat === 'cap') {
    px(4, 2, '#8a5a2b', 8, 2);
    px(3, 4, '#6e4520', 10, 1);
  }
  return c.toDataURL();
}

const RING = { friendly: '#6fae5c', hostile: '#d0473f', dead: '#6b6b6b', neutral: '#b8862f' };

function NpcAvatar({ name, role = '', attitude = 'neutral', size = 40 }) {
  const src = useMemo(() => {
    if (typeof document === 'undefined') return '';
    const key = `${name}|${role}`;
    if (!cache.has(key)) cache.set(key, draw(name, role));
    return cache.get(key);
  }, [name, role]);
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-full bg-[#2a211b]"
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${RING[attitude] || RING.neutral}`, filter: attitude === 'dead' ? 'grayscale(1)' : undefined }}
      title={role ? `${name} · ${role}` : name}
    >
      {src && <img src={src} alt="" width={size} height={size} style={{ imageRendering: 'pixelated', width: size, height: size }} />}
    </span>
  );
}

export default memo(NpcAvatar);

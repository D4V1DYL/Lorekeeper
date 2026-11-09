// Shared game data — dipakai server (aturan) dan client (UI pembuatan karakter).

export const STATS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

export const STAT_LABEL = {
  STR: 'Kekuatan',
  DEX: 'Ketangkasan',
  CON: 'Ketahanan',
  INT: 'Kecerdasan',
  WIS: 'Kebijaksanaan',
  CHA: 'Karisma',
};

export const mod = (score) => Math.floor((score - 10) / 2);
export const fmtMod = (m) => (m >= 0 ? `+${m}` : `${m}`);
export const PROFICIENCY = 2;

export const CLASSES = {
  fighter: {
    label: 'Fighter',
    tagline: 'Tembok baja di garis depan',
    hitDie: 10,
    ac: 16,
    primary: 'STR',
    color: '#d9a94e',
    stats: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 12, CHA: 10 },
    items: ['Pedang panjang', 'Perisai kayu ek', 'Zirah rantai', 'Ramuan penyembuh'],
    feature: 'Second Wind: sekali per istirahat, pulihkan 1d10+1 HP.',
  },
  rogue: {
    label: 'Rogue',
    tagline: 'Bayangan, belati, dan kunci yang selalu terbuka',
    hitDie: 8,
    ac: 14,
    primary: 'DEX',
    color: '#9aa3ad',
    stats: { STR: 8, DEX: 15, CON: 13, INT: 14, WIS: 10, CHA: 12 },
    items: ['Dua belati', 'Busur pendek', 'Alat pencuri', 'Jubah gelap'],
    feature: 'Sneak Attack: +1d6 damage saat menyerang musuh yang lengah.',
  },
  wizard: {
    label: 'Wizard',
    tagline: 'Rumus kuno yang membelah realitas',
    hitDie: 6,
    ac: 12,
    primary: 'INT',
    color: '#8b7cf6',
    stats: { STR: 8, DEX: 13, CON: 14, INT: 15, WIS: 12, CHA: 10 },
    items: ['Tongkat sihir', 'Buku mantra', 'Kantong komponen', 'Lilin'],
    feature: 'Mantra: Fire Bolt, Mage Hand, Magic Missile, Shield, Sleep.',
  },
  cleric: {
    label: 'Cleric',
    tagline: 'Cahaya dewa di tengah kegelapan',
    hitDie: 8,
    ac: 16,
    primary: 'WIS',
    color: '#f2d27a',
    stats: { STR: 14, DEX: 8, CON: 13, INT: 10, WIS: 15, CHA: 12 },
    items: ['Gada', 'Perisai bersimbol suci', 'Simbol suci', 'Ramuan penyembuh'],
    feature: 'Mantra: Sacred Flame, Cure Wounds, Bless, Guiding Bolt.',
  },
  ranger: {
    label: 'Ranger',
    tagline: 'Pemburu dari tepi hutan liar',
    hitDie: 10,
    ac: 14,
    primary: 'DEX',
    color: '#74b06d',
    stats: { STR: 12, DEX: 15, CON: 13, INT: 10, WIS: 14, CHA: 8 },
    items: ['Busur panjang', 'Dua pedang pendek', 'Tali 15 meter', 'Peta usang'],
    feature: 'Favored Enemy: unggul saat melacak dan mengenali buruan.',
  },
  bard: {
    label: 'Bard',
    tagline: 'Lagu yang bisa menyembuhkan atau melukai',
    hitDie: 8,
    ac: 13,
    primary: 'CHA',
    color: '#e0708a',
    stats: { STR: 8, DEX: 14, CON: 12, INT: 10, WIS: 13, CHA: 15 },
    items: ['Lute', 'Rapier', 'Pakaian mewah', 'Sebotol anggur'],
    feature: 'Bardic Inspiration: beri +1d6 pada lemparan teman. Mantra: Vicious Mockery, Healing Word, Charm Person.',
  },
};

export const RACES = {
  human: { label: 'Manusia', bonus: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 }, trait: 'Serbabisa dan ambisius.' },
  elf: { label: 'Elf', bonus: { DEX: 2, INT: 1 }, trait: 'Darkvision, kebal sihir tidur.' },
  dwarf: { label: 'Dwarf', bonus: { CON: 2, STR: 1 }, trait: 'Darkvision, tahan racun.' },
  halfling: { label: 'Halfling', bonus: { DEX: 2, CHA: 1 }, trait: 'Lucky: lemparan d20 bernilai 1 otomatis diulang.' },
  halforc: { label: 'Half-Orc', bonus: { STR: 2, CON: 1 }, trait: 'Pantang tumbang, serangan kritis lebih brutal.' },
  tiefling: { label: 'Tiefling', bonus: { CHA: 2, INT: 1 }, trait: 'Tahan api, berdarah iblis.' },
};

export const CAMPAIGNS = [
  {
    id: 'kabut',
    title: 'Kutukan Hutan Kabut',
    hook: 'Desa Wanaraga kehilangan anak-anaknya satu per satu ke dalam kabut yang bernyanyi setiap bulan purnama. Kepala desa menawarkan seluruh lumbungnya kepada siapa pun yang berani masuk ke hutan.',
  },
  {
    id: 'tenggelam',
    title: 'Reruntuhan Kota Tenggelam',
    hook: 'Dalam semalam laut surut sejauh satu mil, menyingkap menara-menara kota kuno Varunapura. Konon di dalamnya tersimpan Mahkota Raja Laut, dan air akan kembali saat fajar ketiga.',
  },
  {
    id: 'lich',
    title: 'Pesta Topeng Sang Lich',
    hook: 'Undangan berstempel tulang tiba di tangan kalian: Sang Lich Maharani Seroja mengadakan pesta topeng di kastilnya. Mereka yang menolak undangan tidak pernah terlihat lagi.',
  },
  {
    id: 'kereta',
    title: 'Perampokan Kereta Naga',
    hook: 'Kereta lapis baja yang ditarik dua naga muda membawa emas pajak kerajaan melintasi Ngarai Gagak. Kalian disewa untuk menghentikannya, tapi ada pihak lain yang juga mengincar muatannya.',
  },
  { id: 'custom', title: 'Kisah Buatanmu Sendiri', hook: '' },
];

export function totalMod(character, stat) {
  const cls = CLASSES[character.classId];
  return mod(character.stats[stat] ?? 10) + (cls?.primary === stat ? PROFICIENCY : 0);
}

export function buildCharacter({ name, classId, raceId, backstory = '', look }) {
  const cls = CLASSES[classId];
  const race = RACES[raceId];
  if (!cls || !race) throw new Error('Kelas atau ras tidak valid');
  const stats = {};
  for (const s of STATS) stats[s] = cls.stats[s] + (race.bonus[s] || 0);
  // +3 HP 'heroik' di level 1 supaya pertarungan awal tidak terlalu mematikan
  const maxHp = Math.max(1, cls.hitDie + mod(stats.CON) + 3);
  return {
    name,
    classId,
    raceId,
    backstory: String(backstory).slice(0, 300),
    look: sanitizeLook(look, classId, raceId),
    stats,
    maxHp,
    hp: maxHp,
    ac: cls.ac,
    items: cls.items.filter((i) => !/ramuan penyembuh/i.test(i)),
    inv: cls.items.some((i) => /ramuan penyembuh/i.test(i)) ? [{ id: 'potion', qty: 1 }] : [],
    level: 1,
    xp: 0,
    gold: 10,
    cooldowns: {},
    status: {},
  };
}

// ---------------------------------------------------------------------------
// Tampilan pixel art (dirender dengan rig pixelfx)
// ---------------------------------------------------------------------------

export const LOOK = {
  skin: ['#f6d2b0', '#e8b48a', '#c98b6c', '#9c6644', '#6b4130', '#a9b8d8', '#c96a5a', '#9fc48a'],
  hair: ['#2a1d18', '#5a3a22', '#a35d34', '#e2b85a', '#ece6da', '#c2413b', '#5b6ee1', '#3a3448'],
  outfit: ['#5f6f94', '#8c2f39', '#3f7d4f', '#6b4fa0', '#c9a24a', '#2f3b52', '#a8adb8', '#d0703a'],
  pants: ['#38334a', '#4a3424', '#2b3a2a', '#5a4a3a', '#232733', '#6d5a7a'],
  boots: ['#4a2e22', '#2a2230', '#6a4a30', '#3a3a3a'],
};
export const HAIRSTYLES = { rambut: 'Rambut', botak: 'Botak', tudung: 'Tudung', helm: 'Helm' };
export const WEAPON_LABEL = { sword: 'Pedang', greatsword: 'Pedang besar', hammer: 'Palu', spear: 'Tombak', dagger: 'Belati', bow: 'Busur', handle: 'Tongkat', scythe: 'Sabit', none: 'Tangan kosong' };

export const CLASS_LOOK = {
  fighter: { weapons: ['sword', 'greatsword', 'hammer', 'spear'], def: { outfit: '#5f6f94', pants: '#38334a', hairstyle: 'helm' } },
  rogue: { weapons: ['dagger', 'sword', 'bow'], def: { outfit: '#2f3b52', pants: '#232733', hairstyle: 'tudung' } },
  wizard: { weapons: ['handle', 'none', 'scythe'], def: { outfit: '#6b4fa0', pants: '#38334a', hairstyle: 'rambut', hair: '#ece6da' } },
  cleric: { weapons: ['hammer', 'none', 'spear'], def: { outfit: '#c9a24a', pants: '#5a4a3a', hairstyle: 'rambut' } },
  ranger: { weapons: ['bow', 'spear', 'sword'], def: { outfit: '#3f7d4f', pants: '#4a3424', hairstyle: 'tudung' } },
  bard: { weapons: ['sword', 'dagger', 'none'], def: { outfit: '#8c2f39', pants: '#6d5a7a', hairstyle: 'rambut', hair: '#e2b85a' } },
};
const RACE_SKIN = { human: '#e8b48a', elf: '#f6d2b0', dwarf: '#c98b6c', halfling: '#e8b48a', halforc: '#9fc48a', tiefling: '#c96a5a' };

export function defaultLook(classId, raceId) {
  const c = CLASS_LOOK[classId] || CLASS_LOOK.fighter;
  return { skin: RACE_SKIN[raceId] || LOOK.skin[1], hair: '#5a3a22', boots: LOOK.boots[0], weapon: c.weapons[0], ...c.def };
}

const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export function sanitizeLook(look, classId, raceId) {
  const d = defaultLook(classId, raceId);
  const l = look && typeof look === 'object' ? look : {};
  const pick = (k, list) => (isHex(l[k]) && list.includes(l[k].toLowerCase()) ? l[k].toLowerCase() : d[k]);
  return {
    skin: pick('skin', LOOK.skin),
    hair: pick('hair', LOOK.hair),
    outfit: pick('outfit', LOOK.outfit),
    pants: pick('pants', LOOK.pants),
    boots: pick('boots', LOOK.boots),
    hairstyle: HAIRSTYLES[l.hairstyle] ? l.hairstyle : d.hairstyle,
    weapon: (CLASS_LOOK[classId]?.weapons || []).includes(l.weapon) ? l.weapon : d.weapon,
  };
}

// ---------------------------------------------------------------------------
// Skill kelas. fx = id efek pixelfx (src/fx/<kategori>/<nama>).
// mode: act (karakter beraksi & bergerak ke target) · target (efek muncul di target) · self (efek di diri sendiri)
// ---------------------------------------------------------------------------

const BASIC_BY_WEAPON = {
  sword: { name: 'Tebasan Pedang', fx: 'melee/sword-slash', dmg: '1d8' },
  greatsword: { name: 'Belahan Berat', fx: 'melee/heavy-cleave', dmg: '2d6' },
  hammer: { name: 'Hantaman Palu', fx: 'melee/hammer-smash', dmg: '1d8' },
  spear: { name: 'Sapuan Tombak', fx: 'melee/spear-sweep', dmg: '1d6', aoe: 2 },
  dagger: { name: 'Hujan Belati', fx: 'melee/dagger-flurry', dmg: '2d4' },
  bow: { name: 'Tembakan Panah', fx: 'moves/arrow-shot', dmg: '1d8' },
  scythe: { name: 'Tuaian Sabit', fx: 'melee/scythe-reap', dmg: '1d10' },
  handle: { name: 'Misil Arcane', fx: 'arcane/arcane-missiles', dmg: '1d4+1', hits: 3, auto: true },
  none: { name: 'Pukulan Atas', fx: 'melee/uppercut', dmg: '1d4' },
};

// dmg/heal: dadu (+modifier stat ditambahkan otomatis) · aoe: jumlah musuh maksimal yang terkena
// auto: selalu kena · hits: diulang beberapa kali · cd: cooldown dalam ronde · status: efek ke target
export const SKILLS = {
  'sword-combo': { name: 'Kombo Pedang', fx: 'moves/sword-combo', mode: 'act', stat: 'STR', dmg: '2d8', cd: 2, desc: 'Tiga tebasan beruntun.' },
  'dash-strike': { name: 'Serbuan Kilat', fx: 'moves/dash-strike', mode: 'act', stat: 'STR', dmg: '1d10', adv: true, cd: 1, desc: 'Melesat dan menebas; lemparan dengan keuntungan.' },
  'ground-pound': { name: 'Hentakan Bumi', fx: 'moves/ground-pound', mode: 'act', stat: 'STR', dmg: '1d8', aoe: 3, cd: 3, desc: 'Menghantam tanah, kena semua musuh di dekat.' },
  thrust: { name: 'Tusukan Mematikan', fx: 'melee/thrust', mode: 'act', stat: 'DEX', dmg: '1d6', sneak: '2d6', cd: 1, desc: 'Damage besar jika sedang tersembunyi.' },
  'arrow-shot': { name: 'Panah Senyap', fx: 'moves/arrow-shot', mode: 'act', stat: 'DEX', dmg: '1d8', desc: 'Satu panah yang dibidik sempurna.' },
  'smoke-bomb': { name: 'Bom Asap', fx: 'explosions/smoke-bomb', mode: 'self', stat: 'DEX', status: 'hidden', cd: 3, desc: 'Tersembunyi: tak bisa diserang, serangan berikutnya dengan keuntungan (+2d6 untuk Tusukan).' },
  'fireball-throw': { name: 'Bola Api', fx: 'moves/fireball-throw', mode: 'act', stat: 'INT', dmg: '2d6', aoe: 3, cd: 3, desc: 'Ledakan api ke beberapa musuh.' },
  'ice-lance': { name: 'Tombak Es', fx: 'moves/ice-lance-throw', mode: 'act', stat: 'INT', dmg: '1d10', status: 'weak', desc: 'Membekukan: serangan musuh berikutnya melemah.' },
  'frost-nova': { name: 'Nova Beku', fx: 'ice/frost-nova', mode: 'act', stat: 'INT', dmg: '1d4', aoe: 4, status: 'stun', cd: 4, desc: 'Membekukan semua musuh di dekat 1 ronde.' },
  'holy-smite': { name: 'Hukuman Suci', fx: 'moves/holy-smite', mode: 'act', stat: 'WIS', dmg: '2d8', cd: 2, desc: 'Petir cahaya dari langit.' },
  heal: { name: 'Penyembuhan', fx: 'holy/heal', mode: 'target', ally: true, stat: 'WIS', heal: '1d8+2', cd: 2, desc: 'Pulihkan luka sekutu, bisa membangkitkan yang tumbang.' },
  'divine-shield': { name: 'Perisai Ilahi', fx: 'holy/divine-shield', mode: 'target', ally: true, stat: 'WIS', status: 'shield', cd: 3, desc: 'Damage ke sekutu dibagi dua selama 2 ronde.' },
  'root-snare': { name: 'Akar Penjerat', fx: 'nature/root-snare', mode: 'target', stat: 'WIS', dmg: '1d4', status: 'stun', cd: 3, desc: 'Akar menjerat: musuh tak bisa menyerang 1 ronde.' },
  'leaf-storm': { name: 'Badai Daun', fx: 'nature/leaf-storm', mode: 'target', stat: 'WIS', dmg: '1d6', aoe: 3, cd: 2, desc: 'Pusaran daun setajam silet.' },
  curse: { name: 'Ejekan Keji', fx: 'shadow/curse', mode: 'target', stat: 'CHA', dmg: '1d4', status: 'weak', desc: 'Hinaan yang menyakitkan; serangan musuh melemah.' },
  'healing-bloom': { name: 'Lagu Penyembuh', fx: 'nature/healing-bloom', mode: 'target', ally: true, stat: 'CHA', heal: '1d6+1', all: true, cd: 3, desc: 'Melodi yang menyembuhkan seluruh party.' },
  charm: { name: 'Pesona', fx: 'status/charmed', mode: 'target', stat: 'CHA', status: 'stun', cd: 3, desc: 'Musuh terpikat dan tak menyerang 1 ronde.' },
  thunderclap: { name: 'Gelegar Guntur', fx: 'lightning/thunderclap', mode: 'act', stat: 'CHA', dmg: '1d6', aoe: 3, cd: 2, desc: 'Akor yang meledak jadi petir.' },
  potion: { name: 'Minum Ramuan', fx: 'holy/heal', mode: 'self', stat: 'CON', heal: '2d4+2', noMod: true, item: 'Ramuan penyembuh', desc: 'Pakai satu Ramuan penyembuh (2d4+2 HP).' },
};

export const CLASS_SKILLS = {
  fighter: ['sword-combo', 'dash-strike', 'ground-pound'],
  rogue: ['thrust', 'arrow-shot', 'smoke-bomb'],
  wizard: ['fireball-throw', 'ice-lance', 'frost-nova'],
  cleric: ['holy-smite', 'heal', 'divine-shield'],
  ranger: ['arrow-shot', 'root-snare', 'leaf-storm'],
  bard: ['curse', 'healing-bloom', 'charm'],
};

const hasPotion = (c) => (c?.inv || []).some((x) => (x.id === 'potion' || x.id === 'potion_big') && x.qty > 0) || (c?.items || []).some((i) => /ramuan penyembuh|healing potion/i.test(i));

/** Daftar skill sebuah karakter: serangan dasar (sesuai senjata) + skill kelas (+ ramuan bila punya). */
export function skillsFor(character) {
  const weapon = character?.look?.weapon || CLASS_LOOK[character?.classId]?.weapons[0] || 'none';
  const basicStat = { bow: 'DEX', dagger: 'DEX', handle: 'INT' }[weapon] || (character?.classId === 'rogue' || character?.classId === 'ranger' ? 'DEX' : 'STR');
  const basic = { id: 'basic', weapon, ...BASIC_BY_WEAPON[weapon], mode: 'act', stat: basicStat, desc: `Serangan dasar dengan ${WEAPON_LABEL[weapon].toLowerCase()}.` };
  const list = [basic, ...(CLASS_SKILLS[character?.classId] || []).map((id) => ({ id, ...SKILLS[id] }))];
  if (hasPotion(character)) list.push({ id: 'potion', ...SKILLS.potion });
  return list;
}

/** Ringkasan angka skill untuk UI, mis. "2d8+3 · 3 musuh". */
export function skillSummary(skill, character, lang = 'id') {
  const en = lang === 'en';
  const m = character && !skill.noMod ? mod(character.stats?.[skill.stat] ?? 10) : 0;
  const plus = m ? (m > 0 ? `+${m}` : `${m}`) : '';
  const parts = [];
  if (skill.dmg) parts.push(`${skill.hits ? `${skill.hits}× ` : ''}${skill.dmg}${skill.hits ? '' : plus} dmg`);
  if (skill.heal) parts.push(`+${skill.heal}${plus} HP`);
  if (skill.aoe) parts.push(`${skill.aoe} ${en ? 'targets' : 'target'}`);
  if (skill.all) parts.push(en ? 'whole party' : 'semua sekutu');
  if (skill.status) parts.push((en ? { stun: 'stun', weak: 'weaken', shield: 'shield', hidden: 'hide' } : { stun: 'stun', weak: 'lemahkan', shield: 'perisai', hidden: 'sembunyi' })[skill.status]);
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Level & XP
// ---------------------------------------------------------------------------
export const LEVEL_XP = [0, 0, 100, 250, 450, 700, 1000]; // index = level
export const MAX_LEVEL = 6;
export function levelForXp(xp) {
  let lv = 1;
  for (let l = 2; l <= MAX_LEVEL; l++) if (xp >= LEVEL_XP[l]) lv = l;
  return lv;
}

// ---------------------------------------------------------------------------
// Musuh & latar
// ---------------------------------------------------------------------------

/** humanoid: rig pixelfx dengan palet sendiri · critter: efek pixelfx loop · sprite: sprite-kode (lib/stage/sprites.js).
 *  ac, atk, dmg: statistik tempur · xp: hadiah per musuh · boss: bar HP besar. */
export const ENEMY_TYPES = {
  goblin: { label: 'Goblin', kind: 'humanoid', look: { skin: '#7fae4a', hair: '#7fae4a', outfit: '#6a4a30', pants: '#4a3424', boots: '#2a2230', hairstyle: 'botak', weapon: 'dagger' }, attack: 'melee/dagger-flurry', ac: 13, atk: 4, dmg: '1d6', xp: 20 },
  orc: { label: 'Orc', kind: 'humanoid', look: { skin: '#5d7f3a', hair: '#2a1d18', outfit: '#5a3a22', pants: '#3a2a20', boots: '#2a2230', hairstyle: 'rambut', weapon: 'greatsword' }, attack: 'melee/heavy-cleave', ac: 13, atk: 5, dmg: '1d8+1', xp: 40 },
  skeleton: { label: 'Skeleton', kind: 'humanoid', look: { skin: '#e8e4d0', hair: '#e8e4d0', outfit: '#cfc9b0', pants: '#a8a28a', boots: '#6a6658', hairstyle: 'botak', weapon: 'sword' }, attack: 'melee/sword-slash', ac: 13, atk: 4, dmg: '1d6+1', xp: 25 },
  zombie: { label: 'Zombie', kind: 'humanoid', look: { skin: '#8aa07a', hair: '#3a3a2a', outfit: '#4a5a6a', pants: '#3a3448', boots: '#2a2230', hairstyle: 'rambut', weapon: 'none' }, attack: 'melee/claw-swipe', ac: 8, atk: 3, dmg: '1d6+1', xp: 20 },
  cultist: { label: 'Kultis', kind: 'humanoid', look: { skin: '#c9a08a', hair: '#3a1a40', outfit: '#3a1a50', pants: '#2a1238', boots: '#1a1020', hairstyle: 'tudung', weapon: 'scythe' }, attack: 'melee/scythe-reap', ac: 12, atk: 4, dmg: '1d8', xp: 25 },
  bandit: { label: 'Bandit', kind: 'humanoid', look: { skin: '#c98b6c', hair: '#2a1d18', outfit: '#6a4a30', pants: '#3a3a3a', boots: '#2a2230', hairstyle: 'tudung', weapon: 'sword' }, attack: 'melee/sword-slash', ac: 12, atk: 3, dmg: '1d6', xp: 15 },
  knight: { label: 'Ksatria', kind: 'humanoid', look: { skin: '#e8b48a', hair: '#a8adb8', outfit: '#8a8f9c', pants: '#4a4e5a', boots: '#2a2a30', hairstyle: 'helm', weapon: 'spear' }, attack: 'melee/spear-sweep', ac: 16, atk: 5, dmg: '1d8+2', xp: 60 },
  demon: { label: 'Iblis', kind: 'humanoid', look: { skin: '#b8322e', hair: '#1a0a0a', outfit: '#2a1010', pants: '#1a0808', boots: '#100606', hairstyle: 'botak', weapon: 'claw' }, attack: 'melee/claw-swipe', ac: 15, atk: 6, dmg: '2d6', xp: 90 },
  bat: { label: 'Kelelawar', kind: 'critter', fx: 'critters/bat', fly: 34, ac: 12, atk: 4, dmg: '1d4', xp: 8 },
  skull: { label: 'Tengkorak terbang', kind: 'critter', fx: 'critters/flying-skull', fly: 0, ac: 13, atk: 4, dmg: '1d6', xp: 20 },
  eyeball: { label: 'Bola mata', kind: 'critter', fx: 'critters/eyeball', fly: 0, ac: 12, atk: 4, dmg: '1d6', xp: 20 },
  slime: { label: 'Slime', kind: 'critter', fx: 'critters/slime', fly: 0, ac: 8, atk: 3, dmg: '1d6', xp: 12 },
  ghost: { label: 'Hantu', kind: 'critter', fx: 'critters/ghost', fly: 0, ac: 11, atk: 5, dmg: '1d8', xp: 35 },
  snake: { label: 'Ular', kind: 'critter', fx: 'critters/snake', fly: 0, ac: 13, atk: 4, dmg: '1d4+1', xp: 12 },
  wolf: { label: 'Serigala', kind: 'sprite', sprite: 'wolf', attack: 'melee/claw-swipe', ac: 13, atk: 4, dmg: '2d4', xp: 20 },
  spider: { label: 'Laba-laba raksasa', kind: 'sprite', sprite: 'spider', attack: 'melee/claw-swipe', ac: 14, atk: 5, dmg: '1d8', xp: 30 },
  mimic: { label: 'Mimic', kind: 'sprite', sprite: 'mimic', attack: 'melee/claw-swipe', ac: 12, atk: 5, dmg: '1d8+2', xp: 50 },
  dragon: { label: 'Naga', kind: 'sprite', sprite: 'dragon', attack: 'fire/fire-breath', ranged: true, boss: true, ac: 17, atk: 6, dmg: '2d6+2', xp: 300 },
  mushroom: { label: 'Jamur hidup', kind: 'sprite', sprite: 'mushroom', attack: 'nature/spore-burst', ac: 11, atk: 4, dmg: '1d6', xp: 18 },
  golem: { label: 'Golem', kind: 'sprite', sprite: 'golem', attack: 'melee/hammer-smash', big: true, ac: 16, atk: 6, dmg: '2d6+1', xp: 120 },
  wisp: { label: 'Wisp', kind: 'critter', fx: 'critters/wisp', fly: 6, ac: 17, atk: 4, dmg: '1d6', xp: 35 },
};

export const BIOMES = ['forest', 'dungeon', 'cave', 'town', 'castle', 'plains', 'coast', 'swamp', 'snow'];


// ---------------------------------------------------------------------------
// Peta dunia: area yang bisa dijelajahi party
// ---------------------------------------------------------------------------
/** pool: tipe musuh yang wajar di area · boss: muncul setelah `bossAfter` pertempuran dimenangkan · x,y: posisi di peta (%) */
export const AREAS = [
  {
    id: 'hutan',
    name: 'Hutan Kabut Wanaraga',
    biome: 'forest',
    level: [1, 2],
    pool: ['goblin', 'wolf', 'bat', 'bandit'],
    boss: { name: 'Raja Goblin Gerigi', type: 'orc', hp: 34 },
    bossAfter: 2,
    desc: 'Kabut yang bernyanyi, goblin pencuri anak, dan serigala kelaparan.',
    x: 20, y: 64,
    links: ['gua', 'pesisir'],
  },
  {
    id: 'gua',
    name: 'Gua Kristal Bergema',
    biome: 'cave',
    level: [2, 3],
    pool: ['spider', 'slime', 'bat', 'eyeball'],
    boss: { name: 'Ratu Laba-laba Nirmala', type: 'spider', hp: 48 },
    bossAfter: 2,
    desc: 'Kristal yang menyanyikan gema masa lalu dan jaring setebal tali kapal.',
    x: 40, y: 30,
    links: ['hutan', 'ngarai'],
  },
  {
    id: 'pesisir',
    name: 'Reruntuhan Varunapura',
    biome: 'coast',
    level: [2, 4],
    pool: ['snake', 'zombie', 'ghost', 'skeleton', 'mimic'],
    boss: { name: 'Penjaga Mahkota Laut', type: 'knight', hp: 56 },
    bossAfter: 2,
    desc: 'Kota kuno yang muncul saat laut surut, penuh harta dan arwah penasaran.',
    x: 46, y: 78,
    links: ['hutan', 'rawa'],
  },
  {
    id: 'ngarai',
    name: 'Ngarai Gagak',
    biome: 'snow',
    level: [3, 5],
    pool: ['bandit', 'orc', 'wolf', 'knight'],
    boss: { name: 'Naga Muda Bara', type: 'dragon', hp: 70 },
    bossAfter: 3,
    desc: 'Celah beku tempat kereta naga lewat dan para perampok bersembunyi.',
    x: 66, y: 22,
    links: ['gua', 'rawa'],
  },
  {
    id: 'kastil',
    name: 'Kastil Sang Lich',
    biome: 'castle',
    level: [4, 6],
    pool: ['skeleton', 'cultist', 'demon', 'wisp', 'ghost'],
    boss: { name: 'Maharani Seroja', type: 'cultist', hp: 90 },
    bossAfter: 3,
    desc: 'Pesta topeng abadi milik lich yang mengoleksi jiwa para tamunya.',
    x: 86, y: 52,
    links: ['rawa'],
  },
];
AREAS.splice(4, 0, {
  id: 'rawa',
  name: 'Rawa Larung',
  biome: 'swamp',
  level: [3, 5],
  pool: ['mushroom', 'slime', 'snake', 'zombie', 'ghost'],
  boss: { name: 'Golem Lumut Purba', type: 'golem', hp: 76 },
  bossAfter: 3,
  desc: 'Rawa berkabut tempat jamur berjalan dan batu-batu tua bangun dari tidurnya.',
  x: 64, y: 58,
  links: ['pesisir', 'ngarai', 'kastil'],
});

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a]));
export const START_AREA = { kabut: 'hutan', tenggelam: 'pesisir', lich: 'hutan', kereta: 'hutan', custom: 'hutan' };
export const FINAL_AREA = { kabut: 'gua', tenggelam: 'pesisir', lich: 'kastil', kereta: 'ngarai', custom: null };

// ---------------------------------------------------------------------------
// Item: dijual di toko, dijatuhkan bos. bonus: ac (zirah: hanya yang terbaik), atk, dmg, hp (stack)
// ---------------------------------------------------------------------------
export const ITEMS = {
  potion: { name: 'Ramuan penyembuh', type: 'potion', price: 25, heal: '2d4+2', desc: 'Pulihkan 2d4+2 HP.' },
  potion_big: { name: 'Ramuan agung', type: 'potion', price: 60, heal: '4d4+4', desc: 'Pulihkan 4d4+4 HP.' },
  leather: { name: 'Zirah kulit bertatah', type: 'armor', price: 60, bonus: { ac: 1 }, desc: '+1 AC.' },
  scale: { name: 'Zirah sisik', type: 'armor', price: 150, bonus: { ac: 2 }, desc: '+2 AC.' },
  plate: { name: 'Zirah pelat kurcaci', type: 'armor', price: 320, bonus: { ac: 3 }, desc: '+3 AC.' },
  whetstone: { name: 'Batu asah rune', type: 'trinket', price: 55, bonus: { dmg: 1 }, desc: '+1 damage setiap serangan.' },
  ring_focus: { name: 'Cincin fokus', type: 'trinket', price: 110, bonus: { atk: 1 }, desc: '+1 lemparan serangan.' },
  amulet: { name: 'Jimat ketahanan', type: 'trinket', price: 120, bonus: { hp: 4 }, desc: '+4 HP maksimal.' },
  rune_blade: { name: 'Rune senjata +1', type: 'trinket', price: 180, bonus: { atk: 1, dmg: 1 }, desc: '+1 serangan dan +1 damage.' },
  // jarahan bos (tidak dijual)
  goblin_crown: { name: 'Mahkota Gerigi', type: 'relic', bonus: { ac: 1, hp: 3 }, desc: '+1 AC, +3 HP maksimal.' },
  spider_cloak: { name: 'Jubah Sutra Nirmala', type: 'armor', bonus: { ac: 3 }, desc: '+3 AC.' },
  sea_crown: { name: 'Mahkota Laut', type: 'relic', bonus: { atk: 2 }, desc: '+2 lemparan serangan.' },
  ember_scale: { name: 'Sisik Bara', type: 'relic', bonus: { ac: 1, hp: 6 }, desc: '+1 AC, +6 HP maksimal.' },
  golem_heart: { name: 'Jantung Golem', type: 'relic', bonus: { hp: 10 }, desc: '+10 HP maksimal.' },
  phylactery: { name: 'Filakteri Seroja', type: 'relic', bonus: { atk: 2, dmg: 2 }, desc: '+2 serangan, +2 damage.' },
};
export const SHOP_STOCK = ['potion', 'potion_big', 'leather', 'scale', 'plate', 'whetstone', 'ring_focus', 'amulet', 'rune_blade'];
export const BOSS_DROP = { hutan: 'goblin_crown', gua: 'spider_cloak', pesisir: 'sea_crown', ngarai: 'ember_scale', rawa: 'golem_heart', kastil: 'phylactery' };

/** Bonus dari semua item yang dimiliki. Zirah: hanya yang terbaik yang dipakai. */
export function gearBonus(c) {
  const b = { ac: 0, atk: 0, dmg: 0, hp: 0 };
  let armor = 0;
  for (const it of c?.inv || []) {
    const I = ITEMS[it.id];
    if (!I?.bonus || !it.qty) continue;
    if (I.type === 'armor') armor = Math.max(armor, I.bonus.ac || 0);
    else {
      b.ac += I.bonus.ac || 0;
      b.atk += I.bonus.atk || 0;
      b.dmg += I.bonus.dmg || 0;
    }
    b.hp += I.bonus.hp || 0;
  }
  b.ac += armor;
  return b;
}
export const effectiveAC = (c) => (c?.ac || 10) + gearBonus(c).ac;

// ---------------------------------------------------------------------------
// Side quest per area: kalahkan sejumlah musuh tertentu di area itu
// ---------------------------------------------------------------------------
export const QUESTS = [
  { id: 'q_hutan', area: 'hutan', title: 'Pemburu Goblin', desc: 'Kalahkan 4 goblin di Hutan Kabut.', types: ['goblin'], count: 4, reward: { gold: 40, xp: 60, item: 'potion' } },
  { id: 'q_gua', area: 'gua', title: 'Pembersih Jaring', desc: 'Kalahkan 3 laba-laba raksasa.', types: ['spider'], count: 3, reward: { gold: 60, xp: 90, item: 'whetstone' } },
  { id: 'q_pesisir', area: 'pesisir', title: 'Tenangkan Arwah', desc: 'Kalahkan 4 hantu atau zombie.', types: ['ghost', 'zombie'], count: 4, reward: { gold: 70, xp: 110, item: 'potion_big' } },
  { id: 'q_ngarai', area: 'ngarai', title: 'Buronan Ngarai', desc: 'Kalahkan 4 bandit atau orc.', types: ['bandit', 'orc'], count: 4, reward: { gold: 90, xp: 140, item: 'ring_focus' } },
  { id: 'q_rawa', area: 'rawa', title: 'Panen Jamur', desc: 'Kalahkan 4 jamur hidup atau slime.', types: ['mushroom', 'slime'], count: 4, reward: { gold: 90, xp: 150, item: 'amulet' } },
  { id: 'q_kastil', area: 'kastil', title: 'Tamu Tak Diundang', desc: 'Kalahkan 5 kultis atau iblis.', types: ['cultist', 'demon'], count: 5, reward: { gold: 150, xp: 220, item: 'plate' } },
];

// Pembuat nama NPC acak (untuk DM manusia). Gaya nusantara-fantasi untuk ID, fantasi umum untuk EN.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ID = {
  title: ['Ki', 'Nyi', 'Mbok', 'Pak', 'Bu', 'Kapten', 'Datuk', 'Raden', 'Mpu', 'Si', 'Mak', 'Juragan', 'Resi', ''],
  a: ['Sa', 'Wi', 'Dar', 'Ja', 'Lin', 'Ra', 'Su', 'Ken', 'Mar', 'Pra', 'Gan', 'Tri', 'Sek', 'Ban', 'Lan', 'Ar', 'Nara', 'Ju'],
  b: ['rni', 'rya', 'masena', 'gat', 'tang', 'ras', 'kar', 'dra', 'tirta', 'jaya', 'wati', 'sih', 'galih', 'seta', 'muk', 'rong', 'dewi', 'pala'],
  role: ['pedagang garam', 'penjaga gerbang', 'pemilik kedai', 'dukun desa', 'kapten prajurit', 'pencuri pasar', 'tetua desa', 'pandai besi', 'penyair keliling', 'mata-mata kerajaan', 'pendeta kuil', 'nelayan tua'],
};
const EN = {
  title: ['Old', 'Captain', 'Sister', 'Brother', 'Master', 'Lady', 'Sir', 'Mother', 'Mad', ''],
  a: ['Bar', 'El', 'Gor', 'Mira', 'Thal', 'Wren', 'Bram', 'Isol', 'Cor', 'Fen', 'Ros', 'Dag', 'Lio', 'Hal'],
  b: ['ric', 'wyn', 'tha', 'dor', 'enne', 'mund', 'ly', 'gard', 'ra', 'win', 'ford', 'is', 'ani', 'eth'],
  role: ['salt merchant', 'gate guard', 'tavern keeper', 'village witch', 'guard captain', 'market thief', 'village elder', 'blacksmith', 'wandering bard', 'royal spy', 'temple priest', 'old fisher'],
};

export function randomNpc(lang = 'id') {
  const L = lang === 'en' ? EN : ID;
  const name = `${pick(L.title)} ${pick(L.a)}${pick(L.b)}`.trim();
  return { name, role: pick(L.role) };
}

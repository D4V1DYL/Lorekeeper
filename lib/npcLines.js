// Dialog NPC di dalam narasi DM ditulis per baris:  ">> Nama NPC: ucapannya"
// Dipakai server (mencatat NPC yang bicara), log cerita (gelembung chat ber-avatar), ekspor, dan suara.
export const NPC_LINE = /^\s*(?:>>|»)\s*\**([^:*\n]{1,40}?)\**\s*:\s*\**\s*(.*)$/;

const unquote = (s) =>
  String(s)
    .trim()
    .replace(/^["“”«']+|["“”»']+$/g, '')
    .trim();

/** Pecah narasi menjadi potongan narasi dan dialog NPC (urutan dipertahankan). */
export function splitNarration(text, streaming = false) {
  const out = [];
  let buf = [];
  const flush = () => {
    const t = buf.join('\n').trim();
    if (t) out.push({ kind: 'narr', text: t });
    buf = [];
  };
  const lines = String(text || '').split('\n');
  lines.forEach((line, i) => {
    const m = line.match(NPC_LINE);
    if (m && m[2].trim()) {
      flush();
      out.push({ kind: 'npc', name: m[1].trim(), text: unquote(m[2]) });
    } else if (/^\s*(?:>>|»)/.test(line)) {
      // baris dialog yang belum selesai di-stream: tunggu sampai lengkap
      if (!(streaming && i === lines.length - 1)) buf.push(line.replace(/^\s*(?:>>|»)\s*/, ''));
    } else buf.push(line);
  });
  flush();
  return out;
}

/** Nama NPC yang bicara di sebuah narasi. */
export const speakersOf = (text) => [...new Set(splitNarration(text).filter((s) => s.kind === 'npc').map((s) => s.name))];

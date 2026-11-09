'use client';
import { CLASSES, RACES, AREA_BY_ID } from './data';
import { dataT, t } from './i18n';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const md = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>')
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

/** Kisah room sebagai satu file HTML mandiri (tanpa skrip, tanpa aset luar). */
export function storyHTML(room, lang) {
  const D = dataT(lang);
  const T = (k, v) => t(lang, k, v);
  const title = `Lorekeeper · ${room.code}`;
  const heroes = room.players
    .filter((p) => p.character)
    .map((p) => {
      const c = p.character;
      return `<li><b style="color:${CLASSES[c.classId]?.color || '#d9a94e'}">${esc(c.name)}</b> · Lv ${c.level} ${esc(D.race(c.raceId, RACES[c.raceId]?.label))} ${esc(D.className ? D.className(c.classId, CLASSES[c.classId]?.label) : CLASSES[c.classId]?.label)} · ${c.gold ?? 0} gold</li>`;
    })
    .join('');
  const areas = Object.entries(room.areaState || {})
    .filter(([, s]) => s.visited)
    .map(([id, s]) => `${esc(D.areaName(id, AREA_BY_ID[id]?.name || id))}${s.bossDefeated ? ' ★' : ''}`)
    .join(' → ');
  const body = room.log
    .map((e) => {
      switch (e.type) {
        case 'dm':
          return `<section class="dm">${md(e.text)}</section>`;
        case 'action':
          return `<p class="act"><b>${esc(e.author)}</b>${e.data?.skill ? ` <span class="tag">⚔ ${esc(e.data.skill)}${e.data.target ? ` → ${esc(e.data.target)}` : ''}</span>` : ''}<br>${esc(e.text)}</p>`;
        case 'roll': {
          const r = e.data;
          return `<p class="mech">🎲 ${esc(r.name)} · ${esc(r.stat)} — d20 ${r.d20} ${r.mod >= 0 ? '+' : ''}${r.mod} = ${r.total} vs DC ${r.dc} · ${r.success ? T('log.success') : T('log.fail')}</p>`;
        }
        case 'freeroll':
          return `<p class="mech">🎲 ${esc(e.author)}: ${esc(e.data?.expr)} = ${e.data?.total}</p>`;
        case 'combat':
          return `<p class="mech">${esc(e.text)}</p>`;
        case 'chat':
          return '';
        default:
          return `<p class="sys">${esc(e.text)}</p>`;
      }
    })
    .join('\n');
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{color-scheme:light dark}
body{margin:0;background:#f4ecdc;color:#2a2119;font:18px/1.6 Georgia,'Crimson Pro',serif}
main{max-width:720px;margin:0 auto;padding:40px 20px 80px}
h1{font:900 34px/1.1 'Cinzel',Georgia,serif;letter-spacing:.08em;color:#7a4a12;margin:0}
.meta{color:#6b5a45;font-size:15px}
ul{padding-left:20px;font-size:16px}
.dm{border-left:3px solid #b8862f;padding:2px 0 2px 16px;margin:22px 0}
.dm p{margin:.5em 0}
.act{margin:14px 0 14px 15%;padding:8px 12px;border-radius:10px;background:#00000010;font-size:17px}
.tag{font:600 12px system-ui,sans-serif;color:#b45f1c}
.mech{font:13px system-ui,sans-serif;color:#6b5a45;text-align:center;margin:6px 0}
.sys{font-style:italic;color:#6b5a45;text-align:center}
footer{margin-top:40px;font-size:13px;color:#6b5a45;text-align:center}
@media (prefers-color-scheme:dark){body{background:#14100d;color:#ecdfc6}h1{color:#e6b65c}.meta,.mech,.sys,footer{color:#a8977a}.act{background:#ffffff10}}
@media print{body{background:#fff;color:#000}.act{background:#f2f2f2}}
</style></head>
<body><main>
<h1>${esc(room.scene || 'Lorekeeper')}</h1>
<p class="meta">Room ${esc(room.code)} · ${esc(T('game.round', { n: room.round }))}${areas ? ` · ${areas}` : ''}</p>
<ul>${heroes}</ul>
${room.summary ? `<p class="meta"><i>${esc(room.summary)}</i></p>` : ''}
<hr>
${body}
<footer>Lorekeeper · ${new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { dateStyle: 'long' })}</footer>
</main></body></html>`;
}

export function downloadStory(room, lang) {
  const blob = new Blob([storyHTML(room, lang)], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lorekeeper-${room.code}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Cetak/simpan PDF: buka kisah di jendela baru lalu panggil dialog cetak. */
export function printStory(room, lang) {
  const w = window.open('', '_blank');
  if (!w) return downloadStory(room, lang);
  w.document.write(storyHTML(room, lang));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

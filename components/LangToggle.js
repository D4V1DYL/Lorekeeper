'use client';
import { useLang } from '@/lib/lang';

/** Pilihan bahasa UI: ID / EN. */
export default function LangToggle({ className = '' }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`flex shrink-0 overflow-hidden rounded-full border border-gold/25 text-[11px] font-semibold ${className}`} role="group" aria-label="Language">
      {['id', 'en'].map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`px-2 py-1 uppercase transition ${lang === l ? 'bg-gold/20 text-gold' : 'text-parch-dim hover:text-parch'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

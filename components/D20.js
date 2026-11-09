// Ikon d20 bergaya isometrik — dipakai di overlay, tombol, dan logo.
export default function D20({ value, size = 120, tone = '#d9a94e', glow = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden={value == null}>
      {glow && (
        <defs>
          <filter id="d20glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g filter={glow ? 'url(#d20glow)' : undefined} stroke={tone} strokeLinejoin="round">
        <polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill="#1a1411" strokeWidth="2.5" />
        <polygon points="50,22 77,66 23,66" fill="rgba(217,169,78,0.08)" strokeWidth="2" />
        <path d="M50 3 L50 22 M93 27 L77 66 M7 27 L23 66 M50 97 L23 66 M50 97 L77 66 M93 73 L77 66 M7 73 L23 66 M7 27 L50 22 L93 27" fill="none" strokeWidth="1.2" opacity="0.55" />
      </g>
      {value != null && (
        <text x="50" y="55" textAnchor="middle" dominantBaseline="middle" fontFamily="Cinzel, serif" fontWeight="900" fontSize={String(value).length > 1 ? 22 : 26} fill="#ecdfc4">
          {value}
        </text>
      )}
    </svg>
  );
}

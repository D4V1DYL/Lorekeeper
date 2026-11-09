'use client';
import { memo } from 'react';

// Posisi deterministik (tanpa Math.random) agar tidak terjadi hydration mismatch.
const EMBERS = Array.from({ length: 26 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    left: `${(r(1) * 100).toFixed(2)}%`,
    size: 1.5 + r(2) * 2.5,
    duration: 9 + r(3) * 12,
    delay: -r(4) * 20,
    dx: `${(r(5) * 160 - 80).toFixed(0)}px`,
  };
});

function Atmosphere({ rune = true, dim = false }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-ink" />
      {rune && (
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${dim ? 'opacity-[0.06]' : 'opacity-[0.12]'}`}>
          <RuneCircle />
        </div>
      )}
      <div className="vignette absolute inset-0" />
      {!dim && EMBERS.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
            '--dx': e.dx,
            opacity: dim ? 0.5 : 1,
          }}
        />
      ))}
    </div>
  );
}

function RuneCircle() {
  const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  return (
    <svg width="1100" height="1100" viewBox="0 0 1100 1100" className="max-w-none">
      <g className="spin-slow" style={{ transformOrigin: '550px 550px' }}>
        <circle cx="550" cy="550" r="520" fill="none" stroke="#d9a94e" strokeWidth="1.5" />
        <circle cx="550" cy="550" r="470" fill="none" stroke="#d9a94e" strokeWidth="0.75" strokeDasharray="2 10" />
        {glyphs.split('').map((g, i) => {
          const a = (i / glyphs.length) * Math.PI * 2;
          return (
            <text
              key={i}
              x={550 + Math.cos(a) * 495}
              y={550 + Math.sin(a) * 495}
              fill="#d9a94e"
              fontSize="22"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${(a * 180) / Math.PI + 90} ${550 + Math.cos(a) * 495} ${550 + Math.sin(a) * 495})`}
            >
              {g}
            </text>
          );
        })}
      </g>
      <g className="spin-slow-rev" style={{ transformOrigin: '550px 550px' }}>
        <polygon points="550,130 914,760 186,760" fill="none" stroke="#f08a3c" strokeWidth="1" />
        <polygon points="550,970 186,340 914,340" fill="none" stroke="#f08a3c" strokeWidth="1" />
        <circle cx="550" cy="550" r="300" fill="none" stroke="#d9a94e" strokeWidth="0.75" />
      </g>
    </svg>
  );
}

export default memo(Atmosphere);

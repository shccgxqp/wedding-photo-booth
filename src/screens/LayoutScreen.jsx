import { useEffect, useRef, useState } from 'react';

const FRAME_ORDER = ['frame04', 'frame03', 'frame02', 'frame01'];

const FRAME_META = {
  frame04: { en: 'Disco Party', cn: '派對之夜',  ratio: 2090 / 3135 },
  frame03: { en: 'Dreamy',      cn: '雲朵夢境',  ratio: 858  / 2532 },
  frame02: { en: 'Cupid',       cn: '邱比特',    ratio: 784  / 1176 },
  frame01: { en: 'Sweetheart',  cn: '甜心愛戀',  ratio: 779  / 1172 },
};

function Sprig({ size = 22, color = '#BD9A4E', opacity = 0.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ opacity }}>
      <g stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round">
        <path d="M30 8 Q 30 30 30 52" />
        <path d="M30 16 Q 22 18 18 14" /><path d="M30 16 Q 38 18 42 14" />
        <path d="M30 24 Q 20 26 14 22" /><path d="M30 24 Q 40 26 46 22" />
        <path d="M30 34 Q 22 36 18 32" /><path d="M30 34 Q 38 36 42 32" />
        <path d="M30 44 Q 24 45 21 42" /><path d="M30 44 Q 36 45 39 42" />
      </g>
      <g fill={color}>
        <circle cx="22" cy="18" r="1.5" /><circle cx="38" cy="18" r="1.5" />
        <circle cx="14" cy="22" r="1.7" /><circle cx="46" cy="22" r="1.7" />
        <circle cx="22" cy="36" r="1.4" /><circle cx="38" cy="36" r="1.4" />
      </g>
    </svg>
  );
}

function ArrowBtn({ dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 64, height: 64, borderRadius: '50%', cursor: 'pointer',
        background: 'rgba(20,12,7,0.52)', backdropFilter: 'blur(6px)',
        border: '1.5px solid #BD9A4E', color: '#E4C97E',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 22px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(228,201,126,0.1)',
        flexShrink: 0,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: dir === 'right' ? 'scaleX(-1)' : 'none' }}>
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}

export default function LayoutScreen({ onSelectLayout, onOpenFilterEditor }) {
  const carouselRef = useRef(null);
  const [dims, setDims] = useState({ h: 480, w: 800 });
  const [idx, setIdx] = useState(0);
  const n = FRAME_ORDER.length;

  useEffect(() => {
    const update = () => {
      const el = carouselRef.current;
      if (el) setDims({ h: el.clientHeight, w: el.clientWidth });
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(update));
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', update); };
  }, []);

  const prev = () => setIdx((i) => (i - 1 + n) % n);
  const next = () => setIdx((i) => (i + 1) % n);

  const roleOf = (i) => {
    let d = i - idx;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  const CENTER_H = Math.min(dims.h * 0.82, 560);
  const SIDE_X   = Math.min(dims.w * 0.34, 380);
  const HIDE_X   = Math.min(dims.w * 0.52, 500);
  const SIDE_SCALE = 0.56;

  const curMeta = FRAME_META[FRAME_ORDER[idx]];

  return (
    <section className="stage">
      <div className="layout-screen-bg">
        <div className="layout-screen-vignette" />

        {/* Filter editor FAB */}
        {onOpenFilterEditor && (
          <button
            className="filter-editor-fab"
            type="button"
            onClick={onOpenFilterEditor}
            title="濾鏡調整"
          >
            🎨
          </button>
        )}

        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* ── Subtitle ── */}
          <div style={{
            paddingTop: 32, textAlign: 'center', flexShrink: 0,
            fontFamily: '"Noto Serif TC", serif',
            fontSize: '1.05rem', fontWeight: 300, letterSpacing: '0.46em',
            color: '#F4EAD6', opacity: 0.9,
          }}>
            挑 一 個 喜 歡 的 邊 框
          </div>

          {/* ── Carousel ── */}
          <div ref={carouselRef} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
            {FRAME_ORDER.map((id, i) => {
              const role = roleOf(i);
              const isCenter = role === 0;
              const visible = Math.abs(role) <= 1;
              const meta = FRAME_META[id];
              const frameW = CENTER_H * meta.ratio;

              const tx = isCenter ? 0 : role < 0 ? -SIDE_X : SIDE_X;
              const hideTx = role < 0 ? -HIDE_X : HIDE_X;
              const transform = visible
                ? `translate(-50%,-50%) translateX(${tx}px) scale(${isCenter ? 1 : SIDE_SCALE})`
                : `translate(-50%,-50%) translateX(${hideTx}px) scale(${SIDE_SCALE * 0.7})`;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => { if (!isCenter && visible) setIdx(i); }}
                  style={{
                    position: 'absolute', top: '50%', left: '50%',
                    padding: 0, border: 'none', background: 'transparent',
                    height: CENTER_H, width: frameW,
                    transformOrigin: 'center center',
                    transform,
                    cursor: isCenter ? 'default' : visible ? 'pointer' : 'default',
                    opacity: visible ? (isCenter ? 1 : 0.38) : 0,
                    zIndex: isCenter ? 3 : 1,
                    pointerEvents: visible ? 'auto' : 'none',
                    transition: 'transform 380ms cubic-bezier(.5,0,.2,1), opacity 320ms ease',
                    filter: isCenter
                      ? 'drop-shadow(0 28px 48px rgba(0,0,0,0.75))'
                      : 'drop-shadow(0 14px 26px rgba(0,0,0,0.55)) brightness(0.62) saturate(0.78)',
                  }}
                >
                  <img
                    src={`/backgrounds/${id}background.png`}
                    alt={meta.cn}
                    style={{ height: '100%', width: '100%', objectFit: 'contain', display: 'block' }}
                    draggable={false}
                  />
                </button>
              );
            })}

            {/* Arrow buttons */}
            <div style={{ position: 'absolute', top: '50%', left: 20, transform: 'translateY(-50%)', zIndex: 6 }}>
              <ArrowBtn dir="left" onClick={prev} />
            </div>
            <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', zIndex: 6 }}>
              <ArrowBtn dir="right" onClick={next} />
            </div>
          </div>

          {/* ── Frame name ── */}
          <div style={{ textAlign: 'center', flexShrink: 0, paddingTop: 14 }}>
            <div style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontStyle: 'italic', fontWeight: 500,
              fontSize: 'clamp(1.7rem, 4.5vw, 3rem)',
              color: '#FBF4E6', lineHeight: 1,
              textShadow: '0 2px 18px rgba(0,0,0,0.55)',
            }}>
              {curMeta.en}
            </div>
            <div style={{
              fontFamily: '"Noto Serif TC", serif',
              fontSize: '0.82rem', fontWeight: 400, letterSpacing: '0.44em',
              color: '#E4C97E', marginTop: 10,
            }}>
              {curMeta.cn}
            </div>
          </div>

          {/* ── Dot indicators ── */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16, flexShrink: 0 }}>
            {FRAME_ORDER.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => setIdx(i)}
                style={{
                  width: i === idx ? 26 : 9, height: 9, borderRadius: 999,
                  padding: 0, border: 'none', cursor: 'pointer',
                  background: i === idx ? '#E4C97E' : 'rgba(228,201,126,0.28)',
                  transition: 'width 240ms ease, background 240ms ease',
                }}
              />
            ))}
          </div>

          {/* ── Bottom nav ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 36px 28px', flexShrink: 0,
          }}>
            <span style={{
              fontFamily: '"Noto Sans TC", sans-serif',
              fontSize: '0.65rem', letterSpacing: '0.34em', color: '#C9AE84',
              display: 'inline-flex', alignItems: 'center', gap: 10,
            }}>
              <Sprig size={22} />
              WEDDING · PHOTO · BOOTH
            </span>
            <button
              type="button"
              onClick={() => onSelectLayout(FRAME_ORDER[idx])}
              style={{
                background: 'linear-gradient(180deg,#E4C97E,#8C6E32)',
                border: 'none', color: '#3a2c12',
                padding: '14px 38px', borderRadius: 999, cursor: 'pointer',
                fontFamily: '"Noto Serif TC", serif',
                fontSize: '0.95rem', letterSpacing: '0.32em', fontWeight: 600,
                boxShadow: '0 12px 26px -10px rgba(0,0,0,0.7)',
              }}
            >
              下 一 步 →
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}

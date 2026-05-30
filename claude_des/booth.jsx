// 婚宴拍貼機 — 木質復古版（page-by-page prototype）
// 目前頁面：① 版型選擇。其餘頁面之後逐一加入。
//
// 基底沿用「韓系粉白」的版面結構，但整體往復古調整：
//   - 背景換成深胡桃木紋
//   - 卡片變成漂浮在木頭上的奶油色相紙 / 琺瑯牌
//   - 金色細線 → 黃銅刻線、復古玫瑰點綴

const { useLayoutEffect, useRef, useState } = React;

const IPAD_W = 1024;
const IPAD_H = 1366;

// ---- 木質復古色票 ----
const T = {
  cream: '#F4EAD6', // 奶油相紙
  creamHi: '#FBF4E6', // 高光相紙
  creamShade: '#E7D7BC', // 卡片底陰影
  ink: '#2C1B12', // 深咖啡墨
  inkSoft: '#6A4F3A', // 柔褐
  inkFaint: '#937659', // 淡褐
  brass: '#BD9A4E', // 黃銅
  brassHi: '#E4C97E', // 黃銅高光
  brassDeep: '#8C6E32', // 黃銅深
  rose: '#C0796C', // 復古玫瑰（赤陶玫瑰）
  roseDeep: '#A35B4F',
  line: '#D8C39C' // 卡內細線
};

const F = {
  display: '"Cormorant Garamond", "Noto Serif TC", serif',
  serif: '"Noto Serif TC", "Cormorant Garamond", serif',
  body: '"Noto Sans TC", "Inter", sans-serif',
  script: '"Allura", cursive',
  mono: '"DM Mono", monospace'
};

// ---------------------------------------------------------------- //
// Stage host — letterbox the iPad-portrait canvas into the viewport.
function StageHost({ children }) {
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  useLayoutEffect(() => {
    const fit = () => {
      const host = hostRef.current,stage = stageRef.current;
      if (!host || !stage) return;
      const pad = 24;
      const s = Math.min((host.clientWidth - pad * 2) / IPAD_W,
      (host.clientHeight - pad * 2) / IPAD_H);
      stage.style.transform = `scale(${s})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="stage-host" ref={hostRef}>
      <div className="stage" ref={stageRef}>{children}</div>
    </div>);

}

// ---------------------------------------------------------------- //
// 小裝飾：黃銅花藝小枝
function Sprig({ size = 60, color = T.brass, rotate = 0, opacity = 0.9, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ transform: `rotate(${rotate}deg)`, opacity, ...style }}>
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
    </svg>);

}

// 黃銅轉角
function BrassCorner({ size = 30, style = {}, flip = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" style={{ ...style }}>
      <path d="M2 28 L2 8 Q 2 2 8 2 L 28 2" fill="none" stroke={T.brass} strokeWidth="1.4"
      transform={flip} />
      <circle cx={flip ? 28 : 2} cy={flip ? 2 : 28} r="0" fill={T.brass} />
    </svg>);

}

// 小相片版型預覽（奶油底 + 復古色塊）----------------------------------
function PhotoMat({ tone = 0 }) {
  const tones = [
  'radial-gradient(120% 80% at 30% 25%, #e8c8b4 0%, #cf9f86 55%, #a9745a 100%)',
  'radial-gradient(120% 80% at 30% 25%, #d9b9a8 0%, #c2917c 55%, #9c6450 100%)',
  'radial-gradient(120% 80% at 30% 25%, #e2c3a2 0%, #c79b73 55%, #9a6f44 100%)',
  'radial-gradient(120% 80% at 30% 25%, #ddb6a0 0%, #bd8a72 55%, #8f5d47 100%)'];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: tones[tone % 4] }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 40% at 30% 20%, rgba(255,245,230,0.4), transparent 70%)' }} />
      {/* 復古色調覆蓋 */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(120,70,30,0.16)', mixBlendMode: 'multiply' }} />
    </div>);

}

function StripMat() {
  return (
    <div style={{ width: '100%', height: '100%', background: T.creamHi, padding: 7, display: 'flex', flexDirection: 'column', gap: 5 }}>
      {[0, 1, 2, 3].map((i) => <div key={i} style={{ flex: 1, overflow: 'hidden' }}><PhotoMat tone={i} /></div>)}
    </div>);

}
function GridMat() {
  return (
    <div style={{ width: '100%', height: '100%', background: T.creamHi, padding: 7, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 5 }}>
      {[0, 1, 2, 3].map((i) => <div key={i} style={{ overflow: 'hidden' }}><PhotoMat tone={i} /></div>)}
    </div>);

}
function PortraitMat() {
  return (
    <div style={{ width: '100%', height: '100%', background: T.creamHi, padding: 7, display: 'flex' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}><PhotoMat tone={1} /></div>
    </div>);

}

// ---------------------------------------------------------------- //
// ① 版型選擇
function LayoutSelect({ onPick }) {
  const layouts = [
  { id: 'strip', cn: '四格直列', en: 'The Strip', no: '№ 01', shots: '4 SHOTS', desc: '經典人生四格', mat: <StripMat /> },
  { id: 'grid', cn: '2×2 拼貼', en: 'The Quad', no: '№ 02', shots: '4 SHOTS', desc: '方形四宮格', mat: <GridMat />, popular: true },
  { id: 'portrait', cn: '大頭貼', en: 'The Portrait', no: '№ 03', shots: '1 SHOT', desc: '一張就足夠', mat: <PortraitMat /> }];


  return (
    <div style={{
      position: 'absolute', inset: 0, fontFamily: F.body, color: T.cream,
      backgroundImage: 'url("assets/wood-bg.jpg")', backgroundSize: 'cover', backgroundPosition: 'center'
    }}>
      {/* 木紋上的柔和暗角，讓卡片更立體 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 42%, rgba(20,12,7,0) 38%, rgba(12,7,4,0.55) 100%)' }} />
      {/* 頂部微光 */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(70,48,30,0.35) 0%, transparent 26%)' }} />

      <div style={{ position: 'relative', height: '100%' }}>
        {/* ---- 黃銅刻字標頭 ---- */}
        <div style={{ paddingTop: 64, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 18,
            fontFamily: F.body, fontSize: 13, letterSpacing: '0.42em', color: T.brassHi, fontWeight: 500
          }}>
            <span style={{ width: 46, height: 1, background: `linear-gradient(90deg, transparent, ${T.brass})` }} />
            JIM &nbsp;&amp;&nbsp; CAMILLA
            <span style={{ width: 46, height: 1, background: `linear-gradient(90deg, ${T.brass}, transparent)` }} />
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: '0.4em', color: '#C9AE84', marginTop: 14 }}>
            2026 · 11 · 07
          </div>
        </div>

        {/* ---- 主標題 ---- */}
        <div style={{ textAlign: 'center', marginTop: 40, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <Sprig size={56} rotate={0} color={T.brassHi} opacity={0.85} />
          </div>
          <div style={{
            fontFamily: F.display, fontStyle: 'italic', fontWeight: 300, fontSize: 64, lineHeight: 1,
            color: T.creamHi, textShadow: '0 2px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap'
          }}>
            choose <span style={{ color: T.brassHi }}>your</span> frame
          </div>
          <div style={{
            fontFamily: F.serif, fontSize: 24, fontWeight: 300, letterSpacing: '0.42em',
            color: T.cream, marginTop: 22, opacity: 0.92
          }}>
            選 一 款 今 天 的 回 憶
          </div>
        </div>

        {/* ---- 三張版型卡 ---- */}
        <div style={{ marginTop: 56, padding: '0 64px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 30 }}>
          {layouts.map((l) =>
          <button key={l.id} onClick={() => onPick && onPick(l.id)} style={{
            position: 'relative', cursor: 'pointer', textAlign: 'center', padding: 0, border: 'none',
            background: T.cream,
            borderRadius: 3,
            boxShadow: l.popular ?
            `0 0 0 1px ${T.brass}, 0 2px 0 ${T.creamShade}, 0 30px 50px -22px rgba(0,0,0,0.7)` :
            `0 2px 0 ${T.creamShade}, 0 26px 44px -22px rgba(0,0,0,0.65)`,
            transform: l.popular ? 'translateY(-10px)' : 'none'
          }}>
              {/* 內框黃銅細線 */}
              <div style={{ position: 'absolute', inset: 12, border: `1px solid ${T.brass}`, opacity: 0.55, pointerEvents: 'none', borderRadius: 1 }} />
              {/* 黃銅轉角 */}
              <BrassCorner size={26} style={{ position: 'absolute', top: 8, left: 8 }} />
              <BrassCorner size={26} style={{ position: 'absolute', top: 8, right: 8, transform: 'scaleX(-1)' }} />
              <BrassCorner size={26} style={{ position: 'absolute', bottom: 8, left: 8, transform: 'scaleY(-1)' }} />
              <BrassCorner size={26} style={{ position: 'absolute', bottom: 8, right: 8, transform: 'scale(-1,-1)' }} />

              {l.popular &&
            <div style={{
              position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
              background: T.brass, backgroundImage: `linear-gradient(180deg, ${T.brassHi}, ${T.brassDeep})`,
              color: '#3a2c12', fontFamily: F.body, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.3em', padding: '5px 16px', borderRadius: 1,
              boxShadow: '0 4px 10px rgba(0,0,0,0.35)', whiteSpace: 'nowrap'
            }}>MOST LOVED</div>
            }

              <div style={{ padding: '30px 24px 26px' }}>
                {/* 編號 */}
                <div style={{
                fontFamily: F.mono, fontSize: 11, letterSpacing: '0.3em', color: T.brassDeep,
                display: 'flex', justifyContent: 'space-between'
              }}>
                  <span>{l.no}</span><span>{l.shots}</span>
                </div>

                {/* 相紙預覽 */}
                <div style={{
                width: '100%', height: 232, marginTop: 16,
                background: T.creamHi, padding: 10,
                boxShadow: `inset 0 0 0 1px ${T.line}`
              }}>
                  {l.mat}
                </div>

                {/* 文字 */}
                <div style={{ fontFamily: F.display, fontStyle: 'italic', fontSize: 22, color: T.rose, marginTop: 18 }}>
                  {l.en}
                </div>
                <div style={{ fontFamily: F.serif, fontSize: 25, fontWeight: 600, color: T.ink, letterSpacing: '0.12em', marginTop: 4 }}>
                  {l.cn}
                </div>
                <div style={{ fontFamily: F.body, fontSize: 12, color: T.inkSoft, marginTop: 12, letterSpacing: '0.22em' }}>
                  {l.desc}
                </div>

                {/* select */}
                <div style={{
                marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontFamily: F.body, fontSize: 11, letterSpacing: '0.34em', color: T.brassDeep
              }}>
                  <span>SELECT</span><span>→</span>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* ---- 底部黃銅銘牌 ---- */}
        <div style={{
          position: 'absolute', left: 64, right: 64, bottom: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: F.body, fontSize: 11, letterSpacing: '0.34em', color: '#C9AE84'
        }}>
          <span>WEDDING · PHOTO · BOOTH</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <Sprig size={26} color={T.brass} opacity={0.7} />
            EST · MMXXVI
          </span>
        </div>
      </div>
    </div>);

}

// ---------------------------------------------------------------- //
// 圓形黃銅箭頭
function ArrowBtn({ dir, onClick }) {
  return (
    <button onClick={onClick} style={{
      width: 72, height: 72, borderRadius: '50%', cursor: 'pointer',
      background: 'rgba(20,12,7,0.45)', backdropFilter: 'blur(4px)',
      border: `1.5px solid ${T.brass}`, color: T.brassHi,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 8px 22px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(228,201,126,0.15)',
      transition: 'transform 140ms ease, background 140ms ease'
    }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: dir === 'left' ? 'none' : 'scaleX(-1)' }}>
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>);

}

// ① 版型選擇（首頁）— 邊框輪播
function FrameSelect({ onNext }) {
  const frames = [
  { id: 1, src: 'assets/frame01.png', ratio: 779 / 1172, en: 'Sweetheart', cn: '甜心愛戀' },
  { id: 2, src: 'assets/frame02.png', ratio: 784 / 1176, en: 'Cupid', cn: '邱比特' },
  { id: 3, src: 'assets/frame03.png', ratio: 858 / 2532, en: 'Dreamy', cn: '雲朵夢境' },
  { id: 4, src: 'assets/frame04.png', ratio: 1045 / 1567, en: 'Disco Party', cn: '派對之夜' }];

  const [idx, setIdx] = useState(0);
  const n = frames.length;
  const prev = () => setIdx((i) => (i - 1 + n) % n);
  const next = () => setIdx((i) => (i + 1) % n);

  // 每張在輪播中的角色：-1 左側、0 中央、1 右側、其餘隱藏
  const roleOf = (i) => {
    let d = i - idx;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  const CENTER_H = 880;
  const SIDE_SCALE = 0.58;
  const SIDE_X = 360; // 側框水平位移
  const HIDE_X = 460; // 隱藏框再往外推

  return (
    <div style={{
      position: 'absolute', inset: 0, fontFamily: F.body, color: T.cream,
      backgroundImage: 'url("assets/wood-bg.jpg")', backgroundSize: 'cover', backgroundPosition: 'center'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 46%, rgba(20,12,7,0) 34%, rgba(12,7,4,0.6) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(70,48,30,0.35) 0%, transparent 22%)' }} />

      <div style={{ position: 'relative', height: '100%' }}>
        {/* ---- 黃銅刻字標頭 ---- */}
        <div style={{ paddingTop: 52, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 18,
            fontFamily: F.body, fontSize: 13, letterSpacing: '0.42em', color: T.brassHi, fontWeight: 500
          }}>
            <span style={{ width: 46, height: 1, background: `linear-gradient(90deg, transparent, ${T.brass})` }} />
            JIM &nbsp;&amp;&nbsp; CAMILLA
            <span style={{ width: 46, height: 1, background: `linear-gradient(90deg, ${T.brass}, transparent)` }} />
          </div>
          <div style={{
            fontFamily: F.serif, fontSize: 22, fontWeight: 300, letterSpacing: '0.5em',
            color: T.cream, marginTop: 18, opacity: 0.9
          }}>
            挑 一 個 喜 歡 的 邊 框
          </div>
        </div>

        {/* ---- 輪播舞台 ---- */}
        <div style={{ position: 'absolute', top: 196, left: 0, right: 0, height: 940 }}>
          {frames.map((f, i) => {
            const role = roleOf(i);
            const isCenter = role === 0;
            const visible = Math.abs(role) <= 1;
            // 所有框固定 CENTER_H 高，側框用 scale 縮小（只動畫 transform/opacity）
            const tx = isCenter ? 0 : role < 0 ? -SIDE_X : SIDE_X;
            const hideTx = role < 0 ? -HIDE_X : HIDE_X;
            const transform = visible ?
            `translate(-50%, -50%) translateX(${tx}px) scale(${isCenter ? 1 : SIDE_SCALE})` :
            `translate(-50%, -50%) translateX(${hideTx}px) scale(${SIDE_SCALE})`;
            return (
              <button
                key={f.id}
                onClick={() => {if (!isCenter && visible) setIdx(i);}}
                style={{
                  position: 'absolute', top: '50%', left: '50%', padding: 0, border: 'none', background: 'transparent',
                  height: CENTER_H, width: CENTER_H * f.ratio,
                  transformOrigin: 'center center',
                  transform,
                  cursor: isCenter ? 'default' : 'pointer',
                  opacity: visible ? isCenter ? 1 : 0.4 : 0,
                  zIndex: isCenter ? 3 : 1,
                  pointerEvents: visible ? 'auto' : 'none',
                  transition: 'transform 380ms cubic-bezier(.5,0,.2,1), opacity 320ms ease',
                  filter: isCenter ?
                  'drop-shadow(0 26px 44px rgba(0,0,0,0.7))' :
                  'drop-shadow(0 14px 26px rgba(0,0,0,0.55)) brightness(0.7) saturate(0.85)'
                }}>
                <img src={f.src} alt="" style={{
                  height: '100%', width: '100%', objectFit: 'contain', display: 'block'
                }} />
              </button>);

          })}

          {/* 箭頭（疊在最上層、垂直置中） */}
          <div style={{ position: 'absolute', top: '50%', left: 28, transform: 'translateY(-50%)', zIndex: 6 }}>
            <ArrowBtn dir="left" onClick={prev} />
          </div>
          <div style={{ position: 'absolute', top: '50%', right: 28, transform: 'translateY(-50%)', zIndex: 6 }}>
            <ArrowBtn dir="right" onClick={next} />
          </div>
        </div>

        {/* ---- 中央圖框名稱 ---- */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 150, textAlign: 'center' }}>
          <div style={{
            fontFamily: F.display, fontStyle: 'italic', fontWeight: 500, fontSize: 50,
            color: T.creamHi, lineHeight: 1, textShadow: '0 2px 18px rgba(0,0,0,0.5)'
          }}>
            {frames[idx].en}
          </div>
          <div style={{
            fontFamily: F.serif, fontSize: 18, fontWeight: 400, letterSpacing: '0.42em',
            color: T.brassHi, marginTop: 12
          }}>
            {frames[idx].cn}
          </div>
        </div>

        {/* ---- 圓點指示 ---- */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 108,
          display: 'flex', justifyContent: 'center', gap: 12
        }}>
          {frames.map((f, i) =>
          <button key={f.id} onClick={() => setIdx(i)} style={{
            width: i === idx ? 26 : 9, height: 9, borderRadius: 999, padding: 0, border: 'none', cursor: 'pointer',
            background: i === idx ? T.brassHi : 'rgba(228,201,126,0.32)',
            transition: 'width 240ms ease, background 240ms ease'
          }} />
          )}
        </div>

        {/* ---- 底部導覽 ---- */}
        <div style={{
          position: 'absolute', left: 70, right: 70, bottom: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{
            fontFamily: F.body, fontSize: 11, letterSpacing: '0.34em', color: '#C9AE84',
            display: 'inline-flex', alignItems: 'center', gap: 12
          }}>
            <Sprig size={24} color={T.brass} opacity={0.7} />
            WEDDING · PHOTO · BOOTH
          </span>
          <button onClick={onNext} style={{
            background: T.brass, backgroundImage: `linear-gradient(180deg, ${T.brassHi}, ${T.brassDeep})`,
            border: 'none', color: '#3a2c12',
            padding: '15px 40px', borderRadius: 999, cursor: 'pointer',
            fontFamily: F.serif, fontSize: 15, letterSpacing: '0.35em', fontWeight: 600,
            boxShadow: '0 12px 26px -10px rgba(0,0,0,0.7)'
          }}>
            下 一 步 →
          </button>
        </div>
      </div>
    </div>);

}

// ---------------------------------------------------------------- //
// ③ 拍照中
const FILTERS = [
{ id: 'none', cn: '原色', en: 'Original', css: 'none', swatch: 'none' },
{ id: 'fresh', cn: '清新', en: 'Fresh', css: 'brightness(1.08) saturate(1.18) contrast(1.02)', swatch: 'brightness(1.08) saturate(1.18)' },
{ id: 'retro', cn: '美式復古', en: 'Retro', css: 'sepia(0.42) saturate(1.15) contrast(1.06) brightness(1.02)', swatch: 'sepia(0.42) saturate(1.15) contrast(1.06)' },
{ id: 'bw', cn: '黑白', en: 'B&W', css: 'grayscale(1) contrast(1.06)', swatch: 'grayscale(1) contrast(1.06)' }];


// 假相機畫面（用色塊替代真實鏡頭預覽）
function FauxScene() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(120% 90% at 40% 30%, #e7c7ac 0%, #c79a78 45%, #8a5f44 100%)'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(50% 36% at 38% 26%, rgba(255,246,235,0.5), transparent 70%)' }} />
      {/* 朦朧人像剪影 */}
      <div style={{
        position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)',
        width: 420, height: 560,
        background: 'radial-gradient(50% 42% at 50% 30%, rgba(90,55,35,0.55) 0%, rgba(90,55,35,0.2) 55%, transparent 75%)'
      }} />
      <div style={{
        position: 'absolute', left: '50%', bottom: -10, transform: 'translateX(-50%)',
        width: 220, height: 220, borderRadius: '50%',
        background: 'radial-gradient(50% 50% at 50% 40%, rgba(70,42,26,0.5), transparent 70%)'
      }} />
    </div>);

}

function CameraShoot({ onBack, onDone }) {
  const [shot, setShot] = useState(1);
  const total = 4;
  const [filter, setFilter] = useState('retro');
  const [mode, setMode] = useState('photo'); // 'photo' | 'video'
  const activeFilter = FILTERS.find((f) => f.id === filter) || FILTERS[0];

  const capture = () => setShot((s) => {
    if (s >= total) { if (onDone) onDone(); return s; }
    return s + 1;
  });

  return (
    <div style={{
      position: 'absolute', inset: 0, fontFamily: F.body, color: T.cream,
      backgroundImage: 'url("assets/photo01.jpg")', backgroundSize: 'cover', backgroundPosition: 'center'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 42%, rgba(20,12,7,0) 36%, rgba(10,6,4,0.62) 100%)' }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '0 0 44px' }}>
        {/* ---- 返回 ---- */}
        <button onClick={onBack} style={{
          position: 'absolute', top: 44, left: 44, zIndex: 5,
          width: 60, height: 60, borderRadius: '50%', cursor: 'pointer',
          background: 'rgba(20,12,7,0.5)', backdropFilter: 'blur(4px)',
          border: `1.5px solid ${T.brass}`, color: T.brassHi,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        {/* ---- 標頭：第幾張 ---- */}
        <div style={{ paddingTop: 48, textAlign: 'center', flex: '0 0 auto' }}>
          <div style={{
            fontFamily: F.body, fontSize: 12, letterSpacing: '0.42em', color: T.brassHi, fontWeight: 500
          }}>
            JIM &nbsp;&amp;&nbsp; CAMILLA &nbsp;·&nbsp; 4 格 直 列
          </div>
          <div style={{
            fontFamily: F.display, fontStyle: 'italic', fontWeight: 400, fontSize: 64, lineHeight: 1,
            color: T.creamHi, marginTop: 14, textShadow: '0 2px 18px rgba(0,0,0,0.5)'
          }}>
            Photo <span style={{ color: T.brassHi }}>{shot}</span> of {total}
          </div>
          {/* 進度刻度 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
            {Array.from({ length: total }).map((_, i) =>
            <div key={i} style={{
              width: i + 1 === shot ? 40 : 22, height: 5, borderRadius: 999,
              background: i + 1 < shot ? T.brass : i + 1 === shot ? T.brassHi : 'rgba(228,201,126,0.28)',
              transition: 'width 220ms ease, background 220ms ease'
            }} />
            )}
          </div>
        </div>

        {/* ---- 拍照框 ---- */}
        <div style={{
          position: 'relative', margin: '18px 78px 0', height: 680,
          background: T.cream, padding: 16,
          boxShadow: '0 30px 60px -26px rgba(0,0,0,0.75)', flex: '0 0 auto'
        }}>
          {/* 黃銅內框 */}
          <div style={{ position: 'absolute', inset: 8, border: `1px solid ${T.brass}`, opacity: 0.6, pointerEvents: 'none', zIndex: 4 }} />
          <BrassCorner size={28} style={{ position: 'absolute', top: 4, left: 4, zIndex: 4 }} />
          <BrassCorner size={28} style={{ position: 'absolute', top: 4, right: 4, transform: 'scaleX(-1)', zIndex: 4 }} />
          <BrassCorner size={28} style={{ position: 'absolute', bottom: 4, left: 4, transform: 'scaleY(-1)', zIndex: 4 }} />
          <BrassCorner size={28} style={{ position: 'absolute', bottom: 4, right: 4, transform: 'scale(-1,-1)', zIndex: 4 }} />

          {/* 鏡頭預覽（套用濾鏡） */}
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', filter: activeFilter.css }}>
            <FauxScene />
            {/* 取景四角 */}
            {['tl', 'tr', 'bl', 'br'].map((c) => {
              const pos = {
                tl: { top: 18, left: 18, borderTop: '2px solid rgba(255,255,255,0.85)', borderLeft: '2px solid rgba(255,255,255,0.85)' },
                tr: { top: 18, right: 18, borderTop: '2px solid rgba(255,255,255,0.85)', borderRight: '2px solid rgba(255,255,255,0.85)' },
                bl: { bottom: 18, left: 18, borderBottom: '2px solid rgba(255,255,255,0.85)', borderLeft: '2px solid rgba(255,255,255,0.85)' },
                br: { bottom: 18, right: 18, borderBottom: '2px solid rgba(255,255,255,0.85)', borderRight: '2px solid rgba(255,255,255,0.85)' }
              }[c];
              return <div key={c} style={{ position: 'absolute', width: 34, height: 34, ...pos }} />;
            })}
          </div>

          {/* 狀態徽章（不套濾鏡，疊在最上） */}
          <div style={{
            position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
            display: 'flex', alignItems: 'center', gap: 9,
            background: 'rgba(20,12,7,0.5)', color: '#fff', padding: '7px 16px', borderRadius: 999,
            fontFamily: F.body, fontSize: 12, letterSpacing: '0.3em'
          }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: mode === 'video' ? '#E0584B' : T.brassHi }} />
            {mode === 'video' ? 'GIF · 連 拍' : 'LIVE'}
          </div>
        </div>

        {/* ---- 濾鏡選擇（純文字膠囊鈕） ---- */}
        <div style={{
          marginTop: 24, flex: '0 0 auto',
          display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', padding: '0 40px'
        }}>
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                padding: '13px 28px', borderRadius: 999, cursor: 'pointer',
                background: on ? T.brass : 'rgba(20,12,7,0.42)',
                backgroundImage: on ? `linear-gradient(180deg, ${T.brassHi}, ${T.brassDeep})` : 'none',
                border: on ? 'none' : `1px solid rgba(228,201,126,0.32)`,
                color: on ? '#3a2c12' : T.cream,
                fontFamily: F.serif, fontSize: 18, fontWeight: on ? 600 : 400, letterSpacing: '0.16em',
                whiteSpace: 'nowrap',
                boxShadow: on ? '0 8px 20px -8px rgba(0,0,0,0.6)' : 'none',
                transition: 'background 160ms ease, color 160ms ease',
              }}>{f.cn}</button>
            );
          })}
        </div>

        {/* ---- 模式切換 + 快門 ---- */}
        <div style={{
          marginTop: 'auto', paddingTop: 26,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22
        }}>
          {/* 拍照 / 影片 切換 */}
          <div style={{
            display: 'flex', gap: 4, padding: 5, borderRadius: 999,
            background: 'rgba(20,12,7,0.5)', border: `1px solid rgba(228,201,126,0.3)`, backdropFilter: 'blur(4px)'
          }}>
            {[{ id: 'photo', cn: '拍照' }, { id: 'video', cn: '影片' }].map((m) => {
              const on = mode === m.id;
              return (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  padding: '10px 30px', borderRadius: 999, cursor: 'pointer', border: 'none',
                  background: on ? T.brass : 'transparent',
                  backgroundImage: on ? `linear-gradient(180deg, ${T.brassHi}, ${T.brassDeep})` : 'none',
                  color: on ? '#3a2c12' : T.cream,
                  fontFamily: F.serif, fontSize: 16, fontWeight: on ? 600 : 400, letterSpacing: '0.2em',
                  whiteSpace: 'nowrap',
                  transition: 'background 160ms ease, color 160ms ease'
                }}>{m.cn}</button>);

            })}
          </div>

          {/* 快門按鈕 */}
          <button onClick={capture} style={{
            width: 116, height: 116, borderRadius: '50%', cursor: 'pointer', padding: 0,
            background: 'transparent', border: `3px solid ${T.creamHi}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 30px -10px rgba(0,0,0,0.7)'
          }}>
            <span style={{
              ...(mode === 'video' ?
              { width: 44, height: 44, borderRadius: 12, background: '#E0584B' } :
              { width: 92, height: 92, borderRadius: '50%', background: T.creamHi,
                backgroundImage: `linear-gradient(180deg, #fdf6e8, ${T.cream})` })
            }} />
          </button>
        </div>
      </div>
    </div>);

}

// ---------------------------------------------------------------- //
// 裝飾用 QR（非真實可掃，僅展示）
function QRPattern({ size = 200, fg = T.ink, bg = '#fff' }) {
  const cells = 25;
  const cell = size / cells;
  const grid = React.useMemo(() => {
    const g = [];
    let s = 20261107;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let y = 0; y < cells; y++) {
      const row = [];
      for (let x = 0; x < cells; x++) row.push(rnd() > 0.5 ? 1 : 0);
      g.push(row);
    }
    const finder = (cx, cy) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        g[cy + y][cx + x] = edge || inner ? 1 : 0;
      }
      for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
        if ((x === -1 || x === 7 || y === -1 || y === 7) && cy + y >= 0 && cy + y < cells && cx + x >= 0 && cx + x < cells)
          g[cy + y][cx + x] = 0;
      }
    };
    finder(0, 0); finder(cells - 7, 0); finder(0, cells - 7);
    return g;
  }, []);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <rect width={size} height={size} fill={bg} />
      {grid.map((row, y) => row.map((v, x) => v
        ? <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={fg} />
        : null))}
    </svg>
  );
}

// ④ 成品展示
function ResultShow({ onRetake, onHome }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, fontFamily: F.body, color: T.cream,
      backgroundImage: 'url("assets/wood-bg.jpg")', backgroundSize: 'cover', backgroundPosition: 'center',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 44%, rgba(20,12,7,0) 36%, rgba(12,7,4,0.6) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(70,48,30,0.35) 0%, transparent 22%)' }} />

      {/* 撒落小金枝 */}
      <Sprig size={40} color={T.brassHi} rotate={-20} style={{ position: 'absolute', top: 150, left: 90, opacity: 0.5 }} />
      <Sprig size={32} color={T.brassHi} rotate={30} style={{ position: 'absolute', top: 220, right: 110, opacity: 0.45 }} />

      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 64px 48px',
      }}>
        {/* ---- 標頭 ---- */}
        <div style={{ paddingTop: 52, textAlign: 'center', flex: '0 0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 18,
            fontFamily: F.body, fontSize: 13, letterSpacing: '0.42em', color: T.brassHi, fontWeight: 500,
          }}>
            <span style={{ width: 46, height: 1, background: `linear-gradient(90deg, transparent, ${T.brass})` }} />
            JIM &nbsp;&amp;&nbsp; CAMILLA &nbsp;·&nbsp; 2026.11.07
            <span style={{ width: 46, height: 1, background: `linear-gradient(90deg, ${T.brass}, transparent)` }} />
          </div>
          <div style={{
            fontFamily: F.display, fontStyle: 'italic', fontWeight: 400, fontSize: 66, lineHeight: 1,
            color: T.creamHi, marginTop: 14, textShadow: '0 2px 18px rgba(0,0,0,0.5)',
          }}>
            all <span style={{ color: T.brassHi }}>done!</span>
          </div>
        </div>

        {/* ---- 成品照片（直接用框本身的背景，主角） ---- */}
        <div style={{ marginTop: 26, flex: '0 0 auto' }}>
          <div style={{
            position: 'relative', width: 428, height: 644, overflow: 'hidden',
            transform: 'rotate(-1.5deg)',
            background: 'radial-gradient(120% 90% at 35% 25%, #e8c8b0 0%, #cc9e7e 50%, #9a6e4e 100%)',
            boxShadow: '0 36px 70px -28px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.06)',
          }}>
            <img src="assets/frame01.png" alt="成品框" style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            }} />
          </div>
        </div>

        {/* ---- 下方：QR + 動作 ---- */}
        <div style={{
          marginTop: 'auto', paddingTop: 30, flex: '0 0 auto',
          display: 'flex', alignItems: 'stretch', gap: 26, width: '100%', maxWidth: 820, justifyContent: 'center',
        }}>
          {/* QR 卡 */}
          <div style={{
            background: T.cream, borderRadius: 4, padding: 22,
            boxShadow: '0 22px 44px -22px rgba(0,0,0,0.6)', position: 'relative',
            display: 'flex', alignItems: 'center', gap: 20,
          }}>
            <div style={{ position: 'absolute', inset: 9, border: `1px solid ${T.brass}`, opacity: 0.5, pointerEvents: 'none' }} />
            <div style={{ background: '#fff', padding: 7, border: `1px solid ${T.line}` }}>
              <QRPattern size={150} fg={T.ink} bg="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: F.body, fontSize: 10, letterSpacing: '0.32em', color: T.brassDeep }}>
                SCAN · TO · DOWNLOAD
              </div>
              <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.ink, marginTop: 8, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                掃 描 下 載
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: T.inkSoft, marginTop: 12, lineHeight: 1.6, wordBreak: 'break-all' }}>
                /photos/<br />jim-camilla-1107-a3f4.png
              </div>
            </div>
          </div>

          {/* 動作按鈕 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center', minWidth: 240 }}>
            <button onClick={onRetake} style={{
              background: T.brass, backgroundImage: `linear-gradient(180deg, ${T.brassHi}, ${T.brassDeep})`,
              border: 'none', color: '#3a2c12', padding: '20px 28px', borderRadius: 4, cursor: 'pointer',
              fontFamily: F.serif, fontSize: 18, fontWeight: 600, letterSpacing: '0.3em', whiteSpace: 'nowrap',
              boxShadow: '0 12px 26px -10px rgba(0,0,0,0.7)',
            }}>
              再 拍 一 張
            </button>
            <button onClick={onHome} style={{
              background: 'rgba(244,234,214,0.08)', border: `1px solid ${T.brass}`, color: T.creamHi,
              padding: '20px 28px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: F.serif, fontSize: 18, letterSpacing: '0.3em',
            }}>
              回 首 頁 重 選
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- //
function App() {
  const [screen, setScreen] = useState('frame'); // 首頁＝邊框輪播
  return (
    <StageHost>
      {screen === 'frame' && <FrameSelect onNext={() => setScreen('camera')} />}
      {screen === 'camera' && <CameraShoot onBack={() => setScreen('frame')} onDone={() => setScreen('result')} />}
      {screen === 'result' && <ResultShow onRetake={() => setScreen('camera')} onHome={() => setScreen('frame')} />}
    </StageHost>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
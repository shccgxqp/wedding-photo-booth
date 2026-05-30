import { useState, useEffect, useCallback, useRef } from 'react';

const PARAMS = [
  { key: 'brightness', label: '亮度',    hint: '暗 ← → 亮',      min: -100, max: 100, def: 0,   step: 1 },
  { key: 'exposure',   label: '曝光度',  hint: '欠曝 ← → 過曝',  min: -100, max: 100, def: 0,   step: 1 },
  { key: 'contrast',   label: '對比度',  hint: '平 ← → 強',      min: -100, max: 100, def: 0,   step: 1 },
  { key: 'saturate',   label: '飽和度',  hint: '灰 ← → 鮮',      min: -100, max: 100, def: 0,   step: 1 },
  { key: 'colorTemp',  label: '色溫',    hint: '冷藍 ← → 暖黃',  min: -100, max: 100, def: 0,   step: 1 },
  { key: 'tint',       label: '色調',    hint: '綠 ← → 洋紅',    min: -100, max: 100, def: 0,   step: 1 },
  { key: 'vignette',   label: '暗角',    hint: '0 → 強',          min: 0,    max: 100, def: 0,   step: 1 },
  { key: 'intensity',  label: '濾鏡強度', hint: '0% = 原色',      min: 0,    max: 100, def: 100, step: 1 },
];

function makeDefaults() {
  return Object.fromEntries(PARAMS.map(p => [p.key, p.def]));
}

function buildCssFilter(raw) {
  const t = raw.intensity / 100;

  // Scale all adjustments by intensity
  const v = {};
  for (const { key } of PARAMS) {
    v[key] = (key === 'intensity' || key === 'vignette') ? raw[key] : raw[key] * t;
  }

  const parts = [];

  // Exposure (EV stops: +100 = +1 stop = ×2)
  const expFactor = Math.pow(2, v.exposure / 100);
  // Brightness (±100 → ×0.2 to ×1.8)
  const brightFactor = 1 + v.brightness / 100 * 0.8;
  const finalBright = expFactor * brightFactor;
  if (Math.abs(finalBright - 1) > 0.008) parts.push(`brightness(${finalBright.toFixed(3)})`);

  // Contrast
  const contrastVal = 1 + v.contrast / 100 * 0.8;
  if (Math.abs(contrastVal - 1) > 0.008) parts.push(`contrast(${contrastVal.toFixed(2)})`);

  // Saturation
  const saturateVal = Math.max(0, 1 + v.saturate / 100);
  if (Math.abs(saturateVal - 1) > 0.008) parts.push(`saturate(${saturateVal.toFixed(2)})`);

  // 色溫: + = 暖（黃橙 sepia）, - = 冷（藍 hue-rotate ~210deg）
  if (v.colorTemp > 0.5) {
    const sepia = v.colorTemp / 100 * 0.42;
    parts.push(`sepia(${sepia.toFixed(3)})`);
  } else if (v.colorTemp < -0.5) {
    const hue = (-v.colorTemp) / 100 * 210;
    parts.push(`hue-rotate(${hue.toFixed(1)}deg)`);
  }

  // 色調: + = 洋紅（hue 負轉）, - = 綠（hue 正轉）
  if (Math.abs(v.tint) > 0.5) {
    const hue = -(v.tint / 100) * 30;
    parts.push(`hue-rotate(${hue.toFixed(1)}deg)`);
  }

  return parts.length ? parts.join(' ') : 'none';
}

function vignetteStyle(strength) {
  if (strength < 1) return null;
  const alpha = (strength / 100 * 0.72).toFixed(3);
  return `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${alpha}) 100%)`;
}

export default function FilterLab({ videoRef, previewRef, onLabActive }) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState(makeDefaults);
  const [copied, setCopied] = useState(false);
  const [panelPos, setPanelPos] = useState({ bottom: 60, left: 8 });
  const btnRef = useRef(null);
  const vigElRef = useRef(null);

  const cssFilter = buildCssFilter(vals);

  // Apply CSS filter to video
  useEffect(() => {
    if (!videoRef?.current) return;
    if (open) {
      videoRef.current.style.filter = cssFilter === 'none' ? '' : cssFilter;
    } else {
      videoRef.current.style.filter = '';
    }
  }, [cssFilter, open, videoRef]);

  // Manage vignette overlay inside preview
  useEffect(() => {
    const container = previewRef?.current;
    if (!container || !open) {
      vigElRef.current?.remove();
      vigElRef.current = null;
      return;
    }

    if (!vigElRef.current) {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:6;';
      container.appendChild(el);
      vigElRef.current = el;
    }

    const bg = vignetteStyle(vals.vignette);
    vigElRef.current.style.background = bg || '';
  }, [vals.vignette, open, previewRef]);

  // Cleanup vignette on unmount
  useEffect(() => () => vigElRef.current?.remove(), []);

  function toggle() {
    const next = !open;
    if (next && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 316)),
        maxHeight: window.innerHeight - rect.bottom - 16,
      });
    }
    setOpen(next);
    onLabActive?.(next);
    if (!next) {
      vigElRef.current?.remove();
      vigElRef.current = null;
    }
  }

  const update = useCallback((key, value) => {
    setVals(prev => ({ ...prev, [key]: Number(value) }));
  }, []);

  function reset() {
    setVals(makeDefaults());
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(cssFilter);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt('複製此字串到 constants.js：', cssFilter);
    }
  }

  return (
    <div className="filter-lab-wrap">
      <button
        ref={btnRef}
        className={`filter-pill filter-lab-btn${open ? ' active' : ''}`}
        type="button"
        onClick={toggle}
        title="濾鏡調色實驗室"
      >
        調色
      </button>

      {open && (
        <div className="filter-lab-panel" style={{ top: panelPos.top, left: panelPos.left, maxHeight: panelPos.maxHeight, overflowY: 'auto' }}>
          <div className="filter-lab-header">
            <span className="tiny-label">濾鏡調色實驗室</span>
            <button type="button" className="filter-lab-reset" onClick={reset}>重置</button>
          </div>

          <div className="filter-lab-sliders">
            {PARAMS.map(({ key, label, hint, min, max, step, def }) => (
              <div key={key} className="filter-lab-item">
                <label className="filter-lab-row">
                  <span className="filter-lab-label">{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={vals[key]}
                    onChange={e => update(key, e.target.value)}
                    className="filter-lab-slider"
                  />
                  <span className={`filter-lab-val${vals[key] !== def ? ' changed' : ''}`}>
                    {vals[key] > 0 && key !== 'vignette' && key !== 'intensity' ? `+${vals[key]}` : vals[key]}
                  </span>
                </label>
                <span className="filter-lab-hint-inline">{hint}</span>
              </div>
            ))}
          </div>

          <div className="filter-lab-output">
            <code className="filter-lab-code">{cssFilter}</code>
            <button type="button" className="filter-lab-copy" onClick={copy}>
              {copied ? '✓' : '複製'}
            </button>
          </div>

          <p className="filter-lab-hint">
            複製後貼到 <code>constants.js</code> 的 filter 欄位
          </p>
        </div>
      )}
    </div>
  );
}

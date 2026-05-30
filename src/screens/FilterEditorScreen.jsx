import { useState, useRef, useCallback, useEffect } from 'react';

// ── CSS filter params (direct mapping, no internal conversion) ────────────────

const PARAMS = [
  { key: 'brightness',   label: '亮度',     fn: 'brightness',  unit: '',    min: 0,   max: 3,   step: 0.01, def: 1,  hint: '1 = 原始，>1 越亮' },
  { key: 'contrast',     label: '對比度',   fn: 'contrast',    unit: '',    min: 0,   max: 3,   step: 0.01, def: 1,  hint: '1 = 原始，>1 對比越強' },
  { key: 'saturate',     label: '飽和度',   fn: 'saturate',    unit: '',    min: 0,   max: 3,   step: 0.01, def: 1,  hint: '0 = 灰階，1 = 原始，>1 越鮮豔' },
  { key: 'hue-rotate',   label: '色相',     fn: 'hue-rotate',  unit: 'deg', min: 0,   max: 360, step: 1,    def: 0,  hint: '0–360deg 色相旋轉' },
  { key: 'sepia',        label: '棕褐色',   fn: 'sepia',       unit: '',    min: 0,   max: 1,   step: 0.01, def: 0,  hint: '0 = 無，1 = 全棕褐復古' },
  { key: 'grayscale',    label: '灰階',     fn: 'grayscale',   unit: '',    min: 0,   max: 1,   step: 0.01, def: 0,  hint: '0 = 彩色，1 = 全黑白' },
  { key: 'invert',       label: '負片',     fn: 'invert',      unit: '',    min: 0,   max: 1,   step: 0.01, def: 0,  hint: '0 = 正常，1 = 完全負片' },
  { key: 'blur',         label: '模糊',     fn: 'blur',        unit: 'px',  min: 0,   max: 20,  step: 0.1,  def: 0,  hint: '0 = 清晰，越大越模糊' },
  { key: 'opacity',      label: '透明度',   fn: 'opacity',     unit: '',    min: 0,   max: 1,   step: 0.01, def: 1,  hint: '1 = 不透明，0 = 完全透明' },
  { key: 'drop-shadow',  label: '陰影',     fn: 'drop-shadow', unit: 'px',  min: 0,   max: 30,  step: 0.5,  def: 0,  hint: '0 = 無，越大陰影越擴散' },
];

function makeDefaults() {
  return Object.fromEntries(PARAMS.map(p => [p.key, p.def]));
}

// ── CSS builder ───────────────────────────────────────────────────────────────

function buildCss(vals) {
  const parts = [];
  for (const { key, fn, unit, def } of PARAMS) {
    const v = Number(vals[key]);
    if (Math.abs(v - def) < 0.001) continue;
    if (key === 'drop-shadow') {
      parts.push(`drop-shadow(0px 4px ${v}${unit} rgba(0,0,0,0.45))`);
    } else {
      parts.push(`${fn}(${v}${unit})`);
    }
  }
  return parts.length ? parts.join(' ') : 'none';
}

// ── CSS parser → update sliders ───────────────────────────────────────────────

function parseCss(css) {
  const vals = makeDefaults();
  if (!css || css === 'none') return vals;
  const re = /([\w-]+)\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const fn = m[1];
    const raw = m[2].trim();
    const found = PARAMS.find(p => p.fn === fn);
    if (found) {
      const num = parseFloat(raw);
      if (!isNaN(num)) vals[found.key] = num;
    }
  }
  return vals;
}

// ── Component ─────────────────────────────────────────────────────────────────

const DEFAULT_PHOTO = '/frontImg/default-preview.jpg';

export default function FilterEditorScreen({ onBack }) {
  const [vals, setVals] = useState(makeDefaults);
  const [photoSrc, setPhotoSrc] = useState(DEFAULT_PHOTO);
  const [cssInput, setCssInput] = useState('');
  const [cssInputDirty, setCssInputDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const cssFilter = buildCss(vals);

  // Keep cssInput in sync with sliders (unless user is typing in it)
  useEffect(() => {
    if (!cssInputDirty) setCssInput(cssFilter === 'none' ? '' : cssFilter);
  }, [cssFilter, cssInputDirty]);

  const update = useCallback((key, value) => {
    setCssInputDirty(false);
    setVals(prev => ({ ...prev, [key]: Number(value) }));
  }, []);

  function applyInput() {
    const parsed = parseCss(cssInput.trim());
    setVals(parsed);
    setCssInputDirty(false);
  }

  function reset() {
    setVals(makeDefaults());
    setCssInput('');
    setCssInputDirty(false);
  }

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoSrc(URL.createObjectURL(file));
  }

  async function copy() {
    const str = cssFilter === 'none' ? '' : cssFilter;
    try {
      await navigator.clipboard.writeText(str);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt('複製此 CSS filter 到 constants.js：', str);
    }
  }

  return (
    <section className="stage fe-screen">

      {/* ── Left: photo preview ── */}
      <div className="fe-preview-col">
        <div className="fe-photo-wrap">
          <img
            src={photoSrc}
            alt="preview"
            className="fe-photo"
            style={{ filter: cssFilter === 'none' ? 'none' : cssFilter }}
          />
        </div>
        <div className="fe-photo-actions">
          <button type="button" className="ghost-btn" onClick={() => fileInputRef.current?.click()}>
            換底圖
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoUpload}
          />
        </div>
      </div>

      {/* ── Right: controls ── */}
      <div className="fe-controls">
        <div className="fe-header">
          <span className="tiny-label">FILTER EDITOR</span>
          <h2 style={{ margin: 0 }}>濾鏡調色</h2>
        </div>

        {/* CSS string input */}
        <div className="fe-input-row">
          <input
            type="text"
            className="fe-css-input"
            placeholder="貼上 CSS filter string，例：brightness(1.08) contrast(1.1)"
            value={cssInput}
            onChange={e => { setCssInput(e.target.value); setCssInputDirty(true); }}
            onKeyDown={e => e.key === 'Enter' && applyInput()}
            onBlur={() => cssInputDirty && applyInput()}
          />
          <button type="button" className="filter-lab-copy" onClick={applyInput}>套用</button>
        </div>

        {/* Sliders */}
        <div className="fe-sliders">
          {PARAMS.map(({ key, label, unit, min, max, step, def, hint }) => {
            const v = vals[key];
            const changed = Math.abs(v - def) > 0.001;
            return (
              <div key={key} className="fe-slider-item">
                <div className="fe-slider-row">
                  <span className="fe-label">{label}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={v}
                    onChange={e => update(key, e.target.value)}
                    className="filter-lab-slider"
                  />
                  <input
                    type="number"
                    className={`fe-num-input${changed ? ' changed' : ''}`}
                    value={v}
                    min={min}
                    max={max}
                    step={step}
                    onChange={e => update(key, e.target.value)}
                  />
                  <span className="fe-unit">{unit || '—'}</span>
                </div>
                <span className="filter-lab-hint-inline">{hint}</span>
              </div>
            );
          })}
        </div>

        {/* Output */}
        <div className="fe-output">
          <code className="filter-lab-code">{cssFilter}</code>
          <button type="button" className="filter-lab-copy" onClick={copy}>
            {copied ? '✓' : '複製'}
          </button>
        </div>
        <p className="filter-lab-hint">
          複製後貼到 <code>constants.js</code> 的 <code>filter</code> 欄位存入濾鏡
        </p>

        <div className="fe-actions">
          <button type="button" className="ghost-btn" onClick={reset}>重置</button>
          <button type="button" className="ghost-btn" onClick={onBack}>← 回首頁</button>
        </div>
      </div>
    </section>
  );
}

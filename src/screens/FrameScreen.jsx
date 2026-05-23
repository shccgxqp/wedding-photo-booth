import { useApp } from '../context/AppContext.jsx';

export default function FrameScreen({ onSelectFrame, onBack }) {
  const { frames, activeFrame, backgrounds, selectedBackground, setSelectedBackground } = useApp();

  const hasBackgrounds = backgrounds.length > 0;

  return (
    <section className="stage">
      <div className="intro-copy">
        <span className="tiny-label">FRAME SELECT</span>
        <h2>選擇邊框</h2>
      </div>
      <div className="frame-grid">
        {frames.map((frame) => (
          <button
            key={frame.id}
            className={`frame-card${activeFrame === frame.id ? ' selected' : ''}`}
            type="button"
            onClick={() => onSelectFrame(frame.id)}
          >
            <div className={`frame-preview frame-preview--${frame.id}`}>
              <div className="frame-preview__photo" />
            </div>
            <span>{frame.name}</span>
          </button>
        ))}
      </div>

      {hasBackgrounds && (
        <div className="bg-selector">
          <div className="intro-copy" style={{ marginTop: '2rem' }}>
            <span className="tiny-label">BACKGROUND</span>
            <h2>選擇背景</h2>
          </div>
          <div className="bg-grid">
            <button
              className={`bg-thumb${!selectedBackground ? ' selected' : ''}`}
              type="button"
              onClick={() => setSelectedBackground(null)}
              title="預設漸層"
            >
              <div className="bg-thumb__gradient" />
              <span>預設</span>
            </button>
            {backgrounds.map((bg) => (
              <button
                key={bg.filename}
                className={`bg-thumb${selectedBackground?.filename === bg.filename ? ' selected' : ''}`}
                type="button"
                onClick={() => setSelectedBackground(bg)}
                title={bg.filename}
              >
                <img src={bg.url} alt={bg.filename} loading="lazy" />
                <span>{bg.filename.replace(/\.[^.]+$/, '')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="screen-footer">
        <button className="ghost-btn" type="button" onClick={onBack}>
          回版型選擇
        </button>
      </div>
    </section>
  );
}

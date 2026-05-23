import { useApp } from '../context/AppContext.jsx';

export default function LayoutScreen({ onSelectLayout }) {
  const { layouts } = useApp();

  return (
    <section className="stage">
      <div className="intro-copy">
        <span className="tiny-label">FRAME SELECT</span>
        <h2>選一款今天的回憶</h2>
      </div>
      <div className="layout-grid">
        {Object.values(layouts).map((layout) => (
          <button
            key={layout.id}
            className="layout-card"
            type="button"
            onClick={() => onSelectLayout(layout.id)}
          >
            <div className={`layout-preview ${layout.previewClass}`}>
              {Array.from({ length: layout.requiredShots }).map((_, i) => (
                <div key={i} className="preview-slot" />
              ))}
            </div>
            <div className="layout-copy">
              <strong>{layout.name}</strong>
              <span>{layout.description}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

import { useApp } from '../context/AppContext.jsx';

export default function TopBar() {
  const { config } = useApp();
  return (
    <section className="top-bar" aria-label="Wedding photo booth">
      <div>
        <p className="eyebrow">{config.tagline}</p>
        <h1>{config.coupleName}</h1>
      </div>
      <div className="date-pill">{config.weddingDate}</div>
    </section>
  );
}

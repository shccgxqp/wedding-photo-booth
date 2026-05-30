import { useApp } from '../context/AppContext.jsx';

export default function TopBar() {
  const { config } = useApp();
  return (
    <section className="top-bar" aria-label="Wedding photo booth">
      <div>
        <div className="top-bar-tagline">{config.tagline}</div>
        <div className="top-bar-names">{config.coupleName}</div>
      </div>
      <div className="date-pill">{config.weddingDate}</div>
    </section>
  );
}

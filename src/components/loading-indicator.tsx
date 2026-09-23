export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function PageLoading() {
  return <section className="page-loading" role="status" aria-live="polite">
    <div className="loading-caption"><Spinner /><span>Loading your workspace…</span></div>
    <div className="skeleton skeleton-title" />
    <div className="skeleton-grid">{[1, 2, 3].map((item) => <div className="skeleton skeleton-card" key={item} />)}</div>
    <div className="skeleton skeleton-panel" />
  </section>;
}

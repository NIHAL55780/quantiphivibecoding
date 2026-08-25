import './MetricCard.css';

export default function MetricCard({ label, value, hint, icon, tone = 'accent', isLoading }) {
  return (
    <article className="card metric-card">
      <div className={`metric-card__icon${tone === 'amber' ? ' metric-card__icon--amber' : ''}`}>
        {icon}
      </div>

      <div className="metric-card__body">
        <h2 className="metric-card__label">{label}</h2>

        {isLoading ? (
          <>
            <div className="skeleton metric-card__skeleton-value" />
            <div className="skeleton metric-card__skeleton-hint" />
          </>
        ) : (
          <>
            <p className="metric-card__value">{value}</p>
            {hint && <p className="metric-card__hint">{hint}</p>}
          </>
        )}
      </div>
    </article>
  );
}

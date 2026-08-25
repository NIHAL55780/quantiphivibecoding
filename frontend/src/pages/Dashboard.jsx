import { useSubscriptions } from '../hooks/useSubscriptions.js';

import './Dashboard.css';

export default function Dashboard() {
  const { subscriptions, metrics, isLoading, loadError, reload } = useSubscriptions();

  return (
    <div className="dashboard">
      <div className="dashboard__inner">
        <header className="dashboard__header">
          <div>
            <h1 className="dashboard__title">Subscription Tracker</h1>
            <p className="dashboard__subtitle">
              Track recurring spending and upcoming renewals in one place.
            </p>
          </div>
        </header>

        {loadError && (
          <div className="alert alert--error" role="alert">
            <span>{loadError}</span>
            <button type="button" className="button button--ghost" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        <section className="card" style={{ padding: 20 }}>
          {isLoading ? (
            <p>Loading dashboard…</p>
          ) : (
            <p>
              {subscriptions.length} subscription(s) loaded. Monthly burn:{' '}
              {metrics?.totalMonthlyBurn ?? 0}, renewing soon:{' '}
              {metrics?.upcomingRenewalsCount ?? 0}.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

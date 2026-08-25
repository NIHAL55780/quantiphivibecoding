import MetricCard from '../components/MetricCard.jsx';
import { AlertIcon, CalendarIcon, WalletIcon } from '../components/icons.jsx';
import { useSubscriptions } from '../hooks/useSubscriptions.js';
import { formatCurrency } from '../utils/format.js';

import './Dashboard.css';

export default function Dashboard() {
  const { subscriptions, metrics, isLoading, loadError, reload } = useSubscriptions();

  const renewalCount = metrics?.upcomingRenewalsCount ?? 0;

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
            <AlertIcon />
            <span className="dashboard__alert-text">{loadError}</span>
            <button type="button" className="button button--ghost" onClick={reload}>
              Retry
            </button>
          </div>
        )}

        <section className="dashboard__metrics" aria-label="Dashboard metrics">
          <MetricCard
            label="Total Monthly Burn Rate"
            value={formatCurrency(metrics?.totalMonthlyBurn ?? 0, metrics?.currency)}
            hint={
              metrics?.activeCount
                ? `Across ${metrics.activeCount} active ${
                    metrics.activeCount === 1 ? 'subscription' : 'subscriptions'
                  }`
                : 'No active subscriptions yet'
            }
            icon={<WalletIcon />}
            isLoading={isLoading}
          />

          <MetricCard
            label="Upcoming Renewals"
            value={renewalCount}
            hint={`${
              renewalCount === 1 ? 'Subscription renews' : 'Subscriptions renew'
            } within the next ${metrics?.renewalWindowDays ?? 7} days`}
            icon={<CalendarIcon />}
            tone="amber"
            isLoading={isLoading}
          />
        </section>

        <section className="card" style={{ padding: 20 }}>
          <p>{subscriptions.length} subscription(s) loaded.</p>
        </section>
      </div>
    </div>
  );
}

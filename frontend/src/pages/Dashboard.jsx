import MetricCard from '../components/MetricCard.jsx';
import SubscriptionForm from '../components/SubscriptionForm.jsx';
import SubscriptionTable from '../components/SubscriptionTable.jsx';
import ToastStack from '../components/ToastStack.jsx';
import { AlertIcon, CalendarIcon, WalletIcon } from '../components/icons.jsx';
import { useSubscriptions } from '../hooks/useSubscriptions.js';
import { useToasts } from '../hooks/useToasts.js';
import { formatCurrency } from '../utils/format.js';

import './Dashboard.css';

export default function Dashboard() {
  const {
    subscriptions,
    metrics,
    isLoading,
    loadError,
    pendingIds,
    reload,
    addSubscription,
    changeStatus,
    removeSubscription,
  } = useSubscriptions();

  const { toasts, showToast, dismissToast } = useToasts();

  const renewalCount = metrics?.upcomingRenewalsCount ?? 0;

  async function handleAdd(input) {
    const created = await addSubscription(input);
    showToast(`${created.serviceName} added to your subscriptions.`);
    return created;
  }

  async function handleChangeStatus(id, nextStatus) {
    try {
      const updated = await changeStatus(id, nextStatus);
      showToast(
        nextStatus === 'Paused'
          ? `${updated.serviceName} paused and removed from your monthly burn.`
          : `${updated.serviceName} resumed and added back to your monthly burn.`,
      );
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleDelete(subscription) {
    const confirmed = window.confirm(
      `Delete ${subscription.serviceName}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await removeSubscription(subscription.id);
      showToast(`${subscription.serviceName} deleted.`);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

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

        <SubscriptionForm onAdd={handleAdd} />

        <SubscriptionTable
          subscriptions={subscriptions}
          isLoading={isLoading}
          pendingIds={pendingIds}
          onChangeStatus={handleChangeStatus}
          onDelete={handleDelete}
        />
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

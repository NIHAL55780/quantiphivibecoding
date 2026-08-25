import RenewalBadge from './RenewalBadge.jsx';
import StatusToggle from './StatusToggle.jsx';
import { InboxIcon, TrashIcon } from './icons.jsx';
import { describeDaysRemaining, formatCurrency, formatDate } from '../utils/format.js';

import './SubscriptionTable.css';

const COLUMNS = [
  'Service',
  'Cost',
  'Cycle',
  'Monthly Cost',
  'Next Renewal',
  'Renewal Warning',
  'Status',
  'Actions',
];

function LoadingRows() {
  return Array.from({ length: 3 }, (_, rowIndex) => (
    <tr key={rowIndex} className="subscription-table__skeleton-row">
      {COLUMNS.map((column) => (
        <td key={column}>
          <div className="skeleton subscription-table__skeleton-bar" />
        </td>
      ))}
    </tr>
  ));
}

function EmptyState() {
  return (
    <div className="subscription-table__empty">
      <InboxIcon className="subscription-table__empty-icon" />
      <p className="subscription-table__empty-title">No subscriptions yet</p>
      <p className="subscription-table__empty-text">
        Add your first subscription using the form above to start tracking your monthly
        spending and upcoming renewals.
      </p>
    </div>
  );
}

export default function SubscriptionTable({
  subscriptions,
  isLoading,
  pendingIds,
  onChangeStatus,
  onDelete,
}) {
  const showEmptyState = !isLoading && subscriptions.length === 0;

  return (
    <section className="card subscription-table__panel" aria-label="Subscriptions">
      <div className="subscription-table__header">
        <h2 className="subscription-table__heading">Your Subscriptions</h2>
        {!isLoading && subscriptions.length > 0 && (
          <span className="subscription-table__count">
            {subscriptions.length} total
          </span>
        )}
      </div>

      {showEmptyState ? (
        <EmptyState />
      ) : (
        <div className="subscription-table__scroll">
          <table className="subscription-table">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <LoadingRows />
              ) : (
                subscriptions.map((subscription) => {
                  const isPaused = subscription.status === 'Paused';
                  const isPending = pendingIds.has(subscription.id);

                  return (
                    <tr
                      key={subscription.id}
                      className={`${isPaused ? 'subscription-table__row--paused' : ''}${
                        isPending ? ' subscription-table__row--pending' : ''
                      }`}
                    >
                      <td data-label="Service" className="subscription-table__service">
                        {subscription.serviceName}
                      </td>

                      <td data-label="Cost" className="subscription-table__numeric">
                        {formatCurrency(subscription.cost, subscription.currency)}
                      </td>

                      <td data-label="Cycle">{subscription.billingCycle}</td>

                      <td data-label="Monthly Cost" className="subscription-table__monthly">
                        {formatCurrency(subscription.monthlyCost, subscription.currency)}
                      </td>

                      <td data-label="Next Renewal" className="subscription-table__date">
                        {formatDate(subscription.nextRenewalDate)}
                        <span className="subscription-table__date-sub">
                          {describeDaysRemaining(subscription.daysRemaining)}
                        </span>
                      </td>

                      <td data-label="Renewal Warning">
                        <RenewalBadge renewingSoon={subscription.renewingSoon} />
                      </td>

                      <td data-label="Status">
                        <span className={`badge ${isPaused ? 'badge--paused' : 'badge--active'}`}>
                          {subscription.status}
                        </span>
                      </td>

                      <td
                        data-label="Actions"
                        className="subscription-table__actions-cell"
                      >
                        <div className="subscription-table__actions">
                          <StatusToggle
                            status={subscription.status}
                            serviceName={subscription.serviceName}
                            disabled={isPending}
                            onChange={(nextStatus) =>
                              onChangeStatus(subscription.id, nextStatus)
                            }
                          />
                          <button
                            type="button"
                            className="subscription-table__delete"
                            disabled={isPending}
                            aria-label={`Delete ${subscription.serviceName}`}
                            onClick={() => onDelete(subscription)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

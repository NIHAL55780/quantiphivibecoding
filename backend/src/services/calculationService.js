import { differenceInDays, getToday } from '../utils/dates.js';

export const BILLING_CYCLES = ['Monthly', 'Yearly'];
export const STATUSES = ['Active', 'Paused'];
export const RENEWAL_WARNING_WINDOW_DAYS = 7;

const MONTHS_PER_YEAR = 12;

export function roundCurrency(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Monthly equivalent of a subscription's cost, at full precision.
 *
 * Callers that display the value should round it; callers that sum it should
 * round only after summing, so repeated rounding cannot drift the total.
 */
export function calculateMonthlyCost(cost, billingCycle) {
  return billingCycle === 'Yearly' ? cost / MONTHS_PER_YEAR : cost;
}

/**
 * A renewal counts as "soon" only inside a closed window: today (0 days) counts,
 * exactly seven days out counts, and dates already past do not.
 */
export function isRenewingSoon(daysRemaining) {
  return (
    daysRemaining !== null &&
    daysRemaining >= 0 &&
    daysRemaining <= RENEWAL_WARNING_WINDOW_DAYS
  );
}

/**
 * Adds the server-computed fields the dashboard renders, so the frontend never
 * derives cost or renewal timing itself.
 */
export function enrichSubscription(subscription, today = getToday()) {
  const daysRemaining = differenceInDays(today, subscription.nextRenewalDate);

  return {
    ...subscription,
    monthlyCost: roundCurrency(
      calculateMonthlyCost(subscription.cost, subscription.billingCycle),
    ),
    daysRemaining,
    renewingSoon: isRenewingSoon(daysRemaining),
  };
}

export function enrichSubscriptions(subscriptions, today = getToday()) {
  return subscriptions.map((subscription) => enrichSubscription(subscription, today));
}

/**
 * Picks the currency to label aggregate totals with. The brief scopes the app to
 * a single currency, so the most common one among active subscriptions is used
 * rather than applying exchange rates.
 */
function resolveDisplayCurrency(activeSubscriptions) {
  if (activeSubscriptions.length === 0) {
    return 'INR';
  }

  const counts = new Map();
  for (const { currency } of activeSubscriptions) {
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function calculateMetrics(subscriptions, today = getToday()) {
  const active = subscriptions.filter((subscription) => subscription.status === 'Active');

  const totalMonthlyBurn = active.reduce(
    (total, subscription) =>
      total + calculateMonthlyCost(subscription.cost, subscription.billingCycle),
    0,
  );

  const upcomingRenewalsCount = active.filter((subscription) =>
    isRenewingSoon(differenceInDays(today, subscription.nextRenewalDate)),
  ).length;

  return {
    totalMonthlyBurn: roundCurrency(totalMonthlyBurn),
    upcomingRenewalsCount,
    currency: resolveDisplayCurrency(active),
    activeCount: active.length,
    pausedCount: subscriptions.length - active.length,
    totalCount: subscriptions.length,
    renewalWindowDays: RENEWAL_WARNING_WINDOW_DAYS,
  };
}

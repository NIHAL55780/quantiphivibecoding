import { differenceInDays, getToday } from '../utils/dates.js';

export const BILLING_CYCLES = ['Monthly', 'Yearly'];
export const STATUSES = ['Active', 'Paused'];
export const RENEWAL_WARNING_WINDOW_DAYS = 7;

/**
 * The application tracks a single currency. Summing costs across currencies
 * without exchange rates would produce a meaningless total, so mixed currencies
 * are rejected at validation rather than silently added together.
 */
export const SUPPORTED_CURRENCY = 'INR';

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
    currency: SUPPORTED_CURRENCY,
    activeCount: active.length,
    pausedCount: subscriptions.length - active.length,
    totalCount: subscriptions.length,
    renewalWindowDays: RENEWAL_WARNING_WINDOW_DAYS,
  };
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  calculateMetrics,
  calculateMonthlyCost,
  enrichSubscription,
  isRenewingSoon,
  roundCurrency,
} from '../src/services/calculationService.js';
import { differenceInDays, getToday, isValidDateOnly } from '../src/utils/dates.js';

const TODAY = '2026-08-25';

function subscription(overrides = {}) {
  return {
    id: 1,
    serviceName: 'Example',
    cost: 500,
    currency: 'INR',
    billingCycle: 'Monthly',
    nextRenewalDate: '2026-12-01',
    status: 'Active',
    ...overrides,
  };
}

describe('calculateMonthlyCost', () => {
  it('returns the cost unchanged for monthly billing', () => {
    assert.equal(calculateMonthlyCost(500, 'Monthly'), 500);
  });

  it('divides yearly billing by twelve', () => {
    assert.equal(calculateMonthlyCost(12000, 'Yearly'), 1000);
    assert.equal(calculateMonthlyCost(1200, 'Yearly'), 100);
  });
});

describe('differenceInDays', () => {
  it('returns zero for the same calendar day', () => {
    assert.equal(differenceInDays(TODAY, TODAY), 0);
  });

  it('counts whole days forward and backward', () => {
    assert.equal(differenceInDays(TODAY, '2026-09-01'), 7);
    assert.equal(differenceInDays(TODAY, '2026-08-24'), -1);
  });

  it('spans month and year boundaries correctly', () => {
    assert.equal(differenceInDays('2026-12-28', '2027-01-04'), 7);
  });

  it('returns null for malformed or impossible dates', () => {
    assert.equal(differenceInDays(TODAY, '2026-02-31'), null);
    assert.equal(differenceInDays(TODAY, 'not-a-date'), null);
    assert.equal(isValidDateOnly('2026-02-31'), false);
    assert.equal(isValidDateOnly('2026-02-28'), true);
  });
});

describe('isRenewingSoon', () => {
  it('includes both ends of the seven-day window', () => {
    assert.equal(isRenewingSoon(0), true, 'renewing today counts');
    assert.equal(isRenewingSoon(7), true, 'exactly seven days out counts');
  });

  it('excludes renewals beyond the window and already past', () => {
    assert.equal(isRenewingSoon(8), false);
    assert.equal(isRenewingSoon(-1), false);
    assert.equal(isRenewingSoon(null), false);
  });
});

describe('enrichSubscription', () => {
  it('attaches monthly cost, days remaining, and the warning flag', () => {
    const result = enrichSubscription(
      subscription({ cost: 12000, billingCycle: 'Yearly', nextRenewalDate: '2026-08-30' }),
      TODAY,
    );

    assert.equal(result.monthlyCost, 1000);
    assert.equal(result.daysRemaining, 5);
    assert.equal(result.renewingSoon, true);
  });

  it('flags paused subscriptions that are due, so the row still warns', () => {
    const result = enrichSubscription(
      subscription({ status: 'Paused', nextRenewalDate: '2026-08-27' }),
      TODAY,
    );

    assert.equal(result.renewingSoon, true);
  });

  it('does not flag renewals further out than the window', () => {
    const result = enrichSubscription(
      subscription({ nextRenewalDate: '2026-09-15' }),
      TODAY,
    );

    assert.equal(result.renewingSoon, false);
  });
});

describe('calculateMetrics', () => {
  it('returns zeroed metrics for an empty list', () => {
    const metrics = calculateMetrics([], TODAY);

    assert.equal(metrics.totalMonthlyBurn, 0);
    assert.equal(metrics.upcomingRenewalsCount, 0);
    assert.equal(metrics.totalCount, 0);
  });

  it('sums monthly and yearly subscriptions into a monthly burn rate', () => {
    const metrics = calculateMetrics(
      [
        subscription({ id: 1, cost: 500, billingCycle: 'Monthly' }),
        subscription({ id: 2, cost: 12000, billingCycle: 'Yearly' }),
      ],
      TODAY,
    );

    assert.equal(metrics.totalMonthlyBurn, 1500);
  });

  it('excludes paused subscriptions from the burn rate but keeps counting them', () => {
    const subscriptions = [
      subscription({ id: 1, cost: 500, billingCycle: 'Monthly', status: 'Paused' }),
      subscription({ id: 2, cost: 12000, billingCycle: 'Yearly', status: 'Active' }),
    ];

    const metrics = calculateMetrics(subscriptions, TODAY);

    assert.equal(metrics.totalMonthlyBurn, 1000);
    assert.equal(metrics.activeCount, 1);
    assert.equal(metrics.pausedCount, 1);
    assert.equal(metrics.totalCount, 2);
  });

  it('restores the cost when a subscription becomes active again', () => {
    const paused = [subscription({ cost: 500, status: 'Paused' })];
    const resumed = [subscription({ cost: 500, status: 'Active' })];

    assert.equal(calculateMetrics(paused, TODAY).totalMonthlyBurn, 0);
    assert.equal(calculateMetrics(resumed, TODAY).totalMonthlyBurn, 500);
  });

  it('counts only active subscriptions inside the renewal window', () => {
    const metrics = calculateMetrics(
      [
        subscription({ id: 1, nextRenewalDate: '2026-08-25' }), // today
        subscription({ id: 2, nextRenewalDate: '2026-09-01' }), // exactly 7 days
        subscription({ id: 3, nextRenewalDate: '2026-09-02' }), // 8 days, outside
        subscription({ id: 4, nextRenewalDate: '2026-08-20' }), // already past
        subscription({ id: 5, nextRenewalDate: '2026-08-26', status: 'Paused' }),
      ],
      TODAY,
    );

    assert.equal(metrics.upcomingRenewalsCount, 2);
  });

  it('does not let past renewal dates inflate the upcoming count', () => {
    const metrics = calculateMetrics(
      [subscription({ nextRenewalDate: '2020-01-01' })],
      TODAY,
    );

    assert.equal(metrics.upcomingRenewalsCount, 0);
  });

  it('rounds the total once so repeated division cannot drift it', () => {
    const metrics = calculateMetrics(
      [
        subscription({ id: 1, cost: 999, billingCycle: 'Yearly' }),
        subscription({ id: 2, cost: 999, billingCycle: 'Yearly' }),
        subscription({ id: 3, cost: 999, billingCycle: 'Yearly' }),
      ],
      TODAY,
    );

    // 999/12 = 83.25 exactly, so three of them total 249.75.
    assert.equal(metrics.totalMonthlyBurn, 249.75);
  });

  it('rounds currency to two decimal places', () => {
    assert.equal(roundCurrency(83.333333), 83.33);
    assert.equal(roundCurrency(1000), 1000);
  });
});

describe('getToday', () => {
  it('formats the local calendar date as YYYY-MM-DD', () => {
    assert.equal(getToday(new Date(2026, 7, 5)), '2026-08-05');
    assert.match(getToday(), /^\d{4}-\d{2}-\d{2}$/);
  });
});

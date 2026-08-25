import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, describe, it } from 'node:test';

// Set before importing the app so the config module picks up the in-memory
// database instead of touching the developer's real data file.
process.env.DATABASE_PATH = ':memory:';

const { createApp } = await import('../src/app.js');

// Started at module scope rather than in a before() hook: top-level await
// guarantees the server is listening before any suite is registered.
const server = createApp().listen(0);
await once(server, 'listening');
server.unref();

const baseUrl = `http://127.0.0.1:${server.address().port}`;

function futureDate(daysFromToday) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function api(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: response.status, payload: await response.json() };
}

function newSubscription(overrides = {}) {
  return {
    serviceName: 'Netflix',
    cost: 500,
    currency: 'INR',
    billingCycle: 'Monthly',
    nextRenewalDate: futureDate(30),
    ...overrides,
  };
}

after(() => {
  server.close();
});

describe('POST /api/subscriptions', () => {
  it('creates a subscription and returns it with recalculated metrics', async () => {
    const { status, payload } = await api('POST', '/api/subscriptions', newSubscription());

    assert.equal(status, 201);
    assert.equal(payload.success, true);
    assert.equal(payload.data.subscription.serviceName, 'Netflix');
    assert.equal(payload.data.subscription.monthlyCost, 500);
    assert.equal(payload.data.subscription.status, 'Active');
    assert.equal(payload.data.metrics.totalMonthlyBurn, 500);
  });

  it('converts a yearly cost into its monthly equivalent', async () => {
    const { status, payload } = await api(
      'POST',
      '/api/subscriptions',
      newSubscription({ serviceName: 'AWS', cost: 12000, billingCycle: 'Yearly' }),
    );

    assert.equal(status, 201);
    assert.equal(payload.data.subscription.monthlyCost, 1000);
    assert.equal(payload.data.metrics.totalMonthlyBurn, 1500);
  });

  it('rejects a cost that is not greater than zero', async () => {
    const { status, payload } = await api(
      'POST',
      '/api/subscriptions',
      newSubscription({ cost: 0 }),
    );

    assert.equal(status, 400);
    assert.equal(payload.success, false);
    assert.equal(payload.message, 'Cost must be greater than 0');
  });

  it('rejects an empty service name', async () => {
    const { status, payload } = await api(
      'POST',
      '/api/subscriptions',
      newSubscription({ serviceName: '   ' }),
    );

    assert.equal(status, 400);
    assert.equal(payload.message, 'Service name is required');
  });

  it('rejects an unsupported billing cycle', async () => {
    const { status, payload } = await api(
      'POST',
      '/api/subscriptions',
      newSubscription({ billingCycle: 'Weekly' }),
    );

    assert.equal(status, 400);
    assert.match(payload.message, /Billing cycle must be one of/);
  });

  it('rejects a calendar-invalid renewal date', async () => {
    const { status, payload } = await api(
      'POST',
      '/api/subscriptions',
      newSubscription({ nextRenewalDate: '2026-02-31' }),
    );

    assert.equal(status, 400);
    assert.match(payload.message, /valid date/);
  });
});

describe('GET /api/subscriptions', () => {
  it('returns every subscription with server-computed fields', async () => {
    const { status, payload } = await api('GET', '/api/subscriptions');

    assert.equal(status, 200);
    assert.ok(payload.data.length >= 2);

    for (const subscription of payload.data) {
      assert.ok(typeof subscription.monthlyCost === 'number');
      assert.ok(typeof subscription.daysRemaining === 'number');
      assert.ok(typeof subscription.renewingSoon === 'boolean');
    }
  });

  it('flags a subscription renewing exactly seven days out', async () => {
    const created = await api(
      'POST',
      '/api/subscriptions',
      newSubscription({ serviceName: 'Boundary', nextRenewalDate: futureDate(7) }),
    );

    assert.equal(created.payload.data.subscription.daysRemaining, 7);
    assert.equal(created.payload.data.subscription.renewingSoon, true);
  });

  it('does not flag a subscription renewing eight days out', async () => {
    const created = await api(
      'POST',
      '/api/subscriptions',
      newSubscription({ serviceName: 'Outside', nextRenewalDate: futureDate(8) }),
    );

    assert.equal(created.payload.data.subscription.daysRemaining, 8);
    assert.equal(created.payload.data.subscription.renewingSoon, false);
  });
});

describe('PATCH /api/subscriptions/:id/status', () => {
  let subscriptionId;
  let burnBeforePause;

  it('pauses without deleting and removes the cost from the burn rate', async () => {
    const created = await api(
      'POST',
      '/api/subscriptions',
      newSubscription({ serviceName: 'Pausable', cost: 500 }),
    );

    subscriptionId = created.payload.data.subscription.id;
    burnBeforePause = created.payload.data.metrics.totalMonthlyBurn;

    const { status, payload } = await api(
      'PATCH',
      `/api/subscriptions/${subscriptionId}/status`,
      { status: 'Paused' },
    );

    assert.equal(status, 200);
    assert.equal(payload.data.subscription.status, 'Paused');
    assert.equal(payload.data.metrics.totalMonthlyBurn, burnBeforePause - 500);

    const list = await api('GET', '/api/subscriptions');
    const stillPresent = list.payload.data.some((item) => item.id === subscriptionId);
    assert.equal(stillPresent, true, 'paused subscription must remain visible');
  });

  it('restores the cost when resumed', async () => {
    const { payload } = await api('PATCH', `/api/subscriptions/${subscriptionId}/status`, {
      status: 'Active',
    });

    assert.equal(payload.data.subscription.status, 'Active');
    assert.equal(payload.data.metrics.totalMonthlyBurn, burnBeforePause);
  });

  it('rejects an unknown status value', async () => {
    const { status, payload } = await api(
      'PATCH',
      `/api/subscriptions/${subscriptionId}/status`,
      { status: 'Archived' },
    );

    assert.equal(status, 400);
    assert.match(payload.message, /Status must be one of/);
  });

  it('returns 404 for a subscription that does not exist', async () => {
    const { status, payload } = await api('PATCH', '/api/subscriptions/999999/status', {
      status: 'Paused',
    });

    assert.equal(status, 404);
    assert.equal(payload.success, false);
  });
});

describe('GET /api/dashboard/metrics', () => {
  it('returns the calculated dashboard metrics', async () => {
    const { status, payload } = await api('GET', '/api/dashboard/metrics');

    assert.equal(status, 200);
    assert.ok(typeof payload.data.totalMonthlyBurn === 'number');
    assert.ok(typeof payload.data.upcomingRenewalsCount === 'number');
    assert.equal(payload.data.renewalWindowDays, 7);
  });
});

describe('DELETE /api/subscriptions/:id', () => {
  it('deletes an existing subscription and reports fresh metrics', async () => {
    const created = await api(
      'POST',
      '/api/subscriptions',
      newSubscription({ serviceName: 'Temporary', cost: 100 }),
    );

    const id = created.payload.data.subscription.id;
    const { status, payload } = await api('DELETE', `/api/subscriptions/${id}`);

    assert.equal(status, 200);
    assert.equal(payload.success, true);

    const list = await api('GET', '/api/subscriptions');
    assert.equal(
      list.payload.data.some((item) => item.id === id),
      false,
    );
  });

  it('returns 404 when deleting something that is already gone', async () => {
    const { status } = await api('DELETE', '/api/subscriptions/999999');
    assert.equal(status, 404);
  });

  it('rejects a non-numeric id', async () => {
    const { status, payload } = await api('DELETE', '/api/subscriptions/abc');

    assert.equal(status, 400);
    assert.match(payload.message, /positive integer/);
  });
});

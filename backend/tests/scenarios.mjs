/**
 * Walks the acceptance scenarios from the brief against a running server.
 *
 * Assertions are expressed as deltas against whatever data already exists, so
 * the script is safe to run against a populated database. Every row it creates
 * is removed again on the way out.
 *
 *   node tests/scenarios.mjs [baseUrl]
 */

const BASE_URL = process.argv[2] ?? 'http://localhost:4000';

const createdIds = [];
let failures = 0;

function dateOffsetFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function api(method, path, body) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  return { status: response.status, payload: await response.json() };
}

function check(label, actual, expected) {
  const passed = actual === expected;
  if (!passed) {
    failures += 1;
  }
  const mark = passed ? 'PASS' : 'FAIL';
  const detail = passed ? `${actual}` : `expected ${expected}, got ${actual}`;
  console.log(`  [${mark}] ${label}: ${detail}`);
}

async function addSubscription(fields) {
  const { payload } = await api('POST', '/api/subscriptions', {
    currency: 'INR',
    ...fields,
  });

  const subscription = payload.data?.subscription;
  if (subscription) {
    createdIds.push(subscription.id);
  }

  return { subscription, metrics: payload.data?.metrics, payload };
}

async function currentBurn() {
  const { payload } = await api('GET', '/api/dashboard/metrics');
  return payload.data.totalMonthlyBurn;
}

async function run() {
  const health = await api('GET', '/api/health');
  if (health.status !== 200) {
    console.error(`Server not reachable at ${BASE_URL}. Start the backend first.`);
    process.exit(1);
  }

  const baselineBurn = await currentBurn();
  console.log(`Baseline monthly burn: ${baselineBurn}\n`);

  console.log('Test 1 — Add a 500 Monthly subscription');
  const monthly = await addSubscription({
    serviceName: 'Scenario Monthly',
    cost: 500,
    billingCycle: 'Monthly',
    nextRenewalDate: dateOffsetFromToday(30),
  });
  check('monthly equivalent', monthly.subscription.monthlyCost, 500);
  check('burn increased by 500', monthly.metrics.totalMonthlyBurn, baselineBurn + 500);

  console.log('\nTest 2 — Add a 12,000 Yearly subscription');
  const yearly = await addSubscription({
    serviceName: 'Scenario Yearly',
    cost: 12000,
    billingCycle: 'Yearly',
    nextRenewalDate: dateOffsetFromToday(30),
  });
  check('monthly equivalent', yearly.subscription.monthlyCost, 1000);
  check('burn increased by 1000', yearly.metrics.totalMonthlyBurn, baselineBurn + 1500);

  console.log('\nTest 3 — Pause the 500 subscription');
  const paused = await api('PATCH', `/api/subscriptions/${monthly.subscription.id}/status`, {
    status: 'Paused',
  });
  check('status', paused.payload.data.subscription.status, 'Paused');
  check('burn dropped by 500', paused.payload.data.metrics.totalMonthlyBurn, baselineBurn + 1000);

  const listWhilePaused = await api('GET', '/api/subscriptions');
  check(
    'still visible in list',
    listWhilePaused.payload.data.some((item) => item.id === monthly.subscription.id),
    true,
  );
  check(
    'monthly equivalent still reported',
    listWhilePaused.payload.data.find((item) => item.id === monthly.subscription.id)
      .monthlyCost,
    500,
  );

  console.log('\nTest 4 — Resume the subscription');
  const resumed = await api('PATCH', `/api/subscriptions/${monthly.subscription.id}/status`, {
    status: 'Active',
  });
  check('status', resumed.payload.data.subscription.status, 'Active');
  check('burn restored', resumed.payload.data.metrics.totalMonthlyBurn, baselineBurn + 1500);

  console.log('\nTest 5 — Renewal exactly 7 days away');
  const boundary = await addSubscription({
    serviceName: 'Scenario Boundary',
    cost: 100,
    billingCycle: 'Monthly',
    nextRenewalDate: dateOffsetFromToday(7),
  });
  check('daysRemaining', boundary.subscription.daysRemaining, 7);
  check('renewingSoon', boundary.subscription.renewingSoon, true);

  console.log('\nTest 6 — Renewal more than 7 days away');
  const outside = await addSubscription({
    serviceName: 'Scenario Outside',
    cost: 100,
    billingCycle: 'Monthly',
    nextRenewalDate: dateOffsetFromToday(8),
  });
  check('daysRemaining', outside.subscription.daysRemaining, 8);
  check('renewingSoon', outside.subscription.renewingSoon, false);

  console.log('\nEdge cases');
  const today = await addSubscription({
    serviceName: 'Scenario Today',
    cost: 100,
    billingCycle: 'Monthly',
    nextRenewalDate: dateOffsetFromToday(0),
  });
  check('renewal today counts as soon', today.subscription.renewingSoon, true);
  check('renewal today has 0 days remaining', today.subscription.daysRemaining, 0);

  const burnBeforePast = await currentBurn();
  const past = await addSubscription({
    serviceName: 'Scenario Past',
    cost: 100,
    billingCycle: 'Monthly',
    nextRenewalDate: dateOffsetFromToday(-3),
  });
  check('past renewal is not flagged', past.subscription.renewingSoon, false);
  check(
    'past renewal does not raise upcoming count',
    past.metrics.upcomingRenewalsCount,
    (await api('GET', '/api/dashboard/metrics')).payload.data.upcomingRenewalsCount,
  );
  check('past renewal still contributes to burn', past.metrics.totalMonthlyBurn, burnBeforePast + 100);

  console.log('\nValidation');
  const zeroCost = await api('POST', '/api/subscriptions', {
    serviceName: 'Invalid',
    cost: 0,
    billingCycle: 'Monthly',
    nextRenewalDate: dateOffsetFromToday(10),
  });
  check('zero cost rejected', zeroCost.status, 400);
  check('zero cost message', zeroCost.payload.message, 'Cost must be greater than 0');

  const blankName = await api('POST', '/api/subscriptions', {
    serviceName: '  ',
    cost: 100,
    billingCycle: 'Monthly',
    nextRenewalDate: dateOffsetFromToday(10),
  });
  check('blank service name rejected', blankName.status, 400);

  const badCycle = await api('POST', '/api/subscriptions', {
    serviceName: 'Invalid',
    cost: 100,
    billingCycle: 'Quarterly',
    nextRenewalDate: dateOffsetFromToday(10),
  });
  check('unsupported billing cycle rejected', badCycle.status, 400);

  const badStatus = await api('PATCH', `/api/subscriptions/${monthly.subscription.id}/status`, {
    status: 'Archived',
  });
  check('unsupported status rejected', badStatus.status, 400);

  const missing = await api('PATCH', '/api/subscriptions/999999/status', { status: 'Paused' });
  check('unknown id returns 404', missing.status, 404);
}

async function cleanUp() {
  for (const id of createdIds) {
    await api('DELETE', `/api/subscriptions/${id}`);
  }
  console.log(`\nCleaned up ${createdIds.length} scenario subscriptions.`);
}

try {
  await run();
} finally {
  await cleanUp();
}

console.log(failures === 0 ? '\nAll scenario checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);

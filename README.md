# Subscription Tracker & Renewal Dashboard

A full-stack personal finance dashboard for tracking recurring SaaS and streaming
subscriptions, the total monthly burn rate they represent, and which ones renew soon.

Subscriptions can be paused and resumed without being deleted, which acts as a live
savings simulation: pausing a service removes it from the monthly burn rate
immediately, and resuming it adds the cost straight back.

## Design Principle: All Business Logic Is Server-Side

Every financial and date calculation happens in the backend. The API does not return
raw database rows — it returns each subscription already enriched with the values the
dashboard displays:

```json
{
  "id": 2,
  "serviceName": "AWS",
  "cost": 12000,
  "currency": "INR",
  "billingCycle": "Yearly",
  "nextRenewalDate": "2026-08-30",
  "status": "Active",
  "monthlyCost": 1000,
  "daysRemaining": 5,
  "renewingSoon": true
}
```

The React app never divides a yearly cost by twelve, never compares dates, and never
sums a total. It renders `monthlyCost`, `daysRemaining`, and `renewingSoon` exactly as
the server computed them.

## Tech Stack

| Layer    | Technology                              |
| -------- | --------------------------------------- |
| Frontend | React 19 + Vite 6                       |
| Backend  | Node.js + Express 4                     |
| Database | SQLite (`better-sqlite3`)               |
| Tests    | Node's built-in test runner (`node:test`) |

No global installs or external database server are required — SQLite persists to a
file inside `backend/data/`.

## Prerequisites

- Node.js 18 or newer (developed on 20.13.1)
- npm

## Setup and Run

The app runs as two processes. Use two terminals.

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

The API starts on <http://localhost:4000> and creates
`backend/data/subscriptions.db` on first run.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

Vite proxies `/api` to `http://localhost:4000`, so the browser only ever talks to a
single origin and no CORS configuration is needed in development.

### Available Scripts

| Directory  | Command                  | Purpose                                     |
| ---------- | ------------------------ | ------------------------------------------- |
| `backend`  | `npm run dev`            | Start the API with file watching            |
| `backend`  | `npm start`              | Start the API once                          |
| `backend`  | `npm test`               | Unit + API integration tests (37 tests)     |
| `backend`  | `npm run test:scenarios` | Acceptance scenarios against a running API  |
| `frontend` | `npm run dev`            | Start the Vite dev server                   |
| `frontend` | `npm run build`          | Production build                            |
| `frontend` | `npm run lint`           | ESLint                                      |

### Configuration

The backend reads optional environment variables and falls back to sensible defaults:

| Variable        | Default                          | Purpose                        |
| --------------- | -------------------------------- | ------------------------------ |
| `PORT`          | `4000`                           | API port                       |
| `DATABASE_PATH` | `backend/data/subscriptions.db`  | SQLite file (`:memory:` works) |
| `CORS_ORIGIN`   | `*`                              | Allowed CORS origin            |

## API Reference

All responses use a consistent envelope:

```json
{ "success": true, "data": ... }
{ "success": false, "message": "Cost must be greater than 0" }
```

| Method   | Endpoint                          | Description                                      |
| -------- | --------------------------------- | ------------------------------------------------ |
| `GET`    | `/api/health`                     | Liveness check                                   |
| `GET`    | `/api/subscriptions`              | All subscriptions, enriched with computed fields  |
| `POST`   | `/api/subscriptions`              | Create a subscription                            |
| `PATCH`  | `/api/subscriptions/:id/status`   | Change status between `Active` and `Paused`      |
| `DELETE` | `/api/subscriptions/:id`          | Delete a subscription                            |
| `GET`    | `/api/dashboard/metrics`          | Calculated dashboard metrics                     |

### Example: create a subscription

```bash
curl -X POST http://localhost:4000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
        "serviceName": "Netflix",
        "cost": 649,
        "currency": "INR",
        "billingCycle": "Monthly",
        "nextRenewalDate": "2026-09-28"
      }'
```

### Mutations return fresh metrics

`POST`, `PATCH`, and `DELETE` return recalculated metrics alongside the affected
record:

```json
{
  "success": true,
  "data": {
    "subscription": { "id": 1, "status": "Paused", "monthlyCost": 500, "...": "..." },
    "metrics": { "totalMonthlyBurn": 1000, "upcomingRenewalsCount": 2, "...": "..." }
  }
}
```

This lets the dashboard update the burn rate in a single round trip when a toggle is
flipped, rather than guessing optimistically or issuing a follow-up request.

### Metrics response

```json
{
  "totalMonthlyBurn": 6949,
  "upcomingRenewalsCount": 3,
  "currency": "INR",
  "activeCount": 5,
  "pausedCount": 0,
  "totalCount": 5,
  "renewalWindowDays": 7
}
```

## Business Rules

**Monthly cost.** A `Monthly` subscription contributes its cost as-is. A `Yearly`
subscription contributes `cost / 12`, so ₹12,000/year becomes ₹1,000/month.

**Monthly burn rate.** The sum of the monthly cost of every `Active` subscription.
Paused subscriptions are excluded from the total but remain visible in the table and
still display their own monthly equivalent. Each value is summed at full precision and
the total is rounded once, so repeated division cannot cause the total to drift.

**Renewal window.** `daysRemaining = nextRenewalDate - today`, measured in whole
calendar days. A subscription is `renewingSoon` when
`0 <= daysRemaining <= 7`. Renewing today counts, exactly seven days out counts, and a
date already in the past does not.

**Date handling.** `nextRenewalDate` is stored as a date-only `YYYY-MM-DD` value rather
than a timestamp, and both dates are anchored to UTC midnight before subtracting. This
makes day arithmetic exact — without it, a renewal seven days out can round down to six
because of a few hours' offset.

## Validation

The backend validates every write and is the source of truth. The form mirrors these
rules for instant feedback, but a request that bypasses the UI is rejected all the same.

| Rule                                      | Response                                            |
| ----------------------------------------- | --------------------------------------------------- |
| Service name present and non-blank        | `400` "Service name is required"                     |
| Cost is a number greater than zero        | `400` "Cost must be greater than 0"                  |
| Currency is `INR` (defaults when omitted) | `400` "Currency must be INR. Mixed currencies are not supported." |
| Billing cycle is `Monthly` or `Yearly`    | `400` "Billing cycle must be one of: Monthly, Yearly" |
| Renewal date is a real calendar date      | `400` "…must be a valid date in YYYY-MM-DD format"   |
| Status is `Active` or `Paused`             | `400` "Status must be one of: Active, Paused"        |
| Unknown subscription id                   | `404` with a descriptive message                     |

A `CHECK` constraint on the table enforces `cost > 0` as a second line of defence
behind the validation layer.

## Project Structure

```
project/
├── backend/
│   ├── src/
│   │   ├── app.js                    Express app assembly
│   │   ├── server.js                 Entry point
│   │   ├── config.js                 Environment-driven configuration
│   │   ├── controllers/              Request handling, no business rules
│   │   ├── routes/                   Endpoint definitions only
│   │   ├── services/
│   │   │   ├── calculationService.js Pure business logic
│   │   │   └── subscriptionService.js Orchestration
│   │   ├── repositories/             All SQL, isolated here
│   │   ├── db/                       Connection + schema
│   │   ├── middleware/               Central error handling
│   │   └── utils/                    Dates, validation, response envelope
│   ├── tests/
│   │   ├── calculationService.test.js Unit tests for the business rules
│   │   ├── api.test.js                HTTP integration tests
│   │   └── scenarios.mjs              Acceptance scenarios from the brief
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/               MetricCard, SubscriptionForm,
│   │   │                             SubscriptionTable, StatusToggle,
│   │   │                             RenewalBadge, ToastStack
│   │   ├── pages/Dashboard.jsx       Page composition
│   │   ├── hooks/                    useSubscriptions, useToasts
│   │   ├── services/api.js           Every backend call lives here
│   │   └── utils/format.js           Display formatting only
│   └── package.json
│
└── README.md
```

Business logic sits in `services/`, never in route files. `repositories/` is the only
place that knows SQL, so swapping SQLite for PostgreSQL means rewriting one module.

## Testing

```bash
cd backend
npm test
```

37 tests run without needing a server or a database file — the API tests boot the app
against an in-memory SQLite instance on an ephemeral port.

Coverage includes monthly/yearly conversion, the burn rate with paused subscriptions
excluded and restored, both ends of the seven-day window, renewals today, past
renewals, rounding behaviour, every validation rule, and the `404` paths.

To exercise a running server end to end:

```bash
cd backend
npm run dev            # in one terminal
npm run test:scenarios # in another
```

This walks the six scenarios from the brief plus the edge cases, reports each check,
and deletes the rows it created. It asserts on deltas, so it is safe to run against a
database that already has data.

## Edge Cases Handled

- Yearly costs are divided by twelve for the monthly equivalent.
- Paused subscriptions stay visible and keep showing their monthly equivalent.
- Paused subscriptions are excluded from the monthly burn rate.
- Resuming restores the cost to the burn rate immediately.
- A renewal exactly seven days away is flagged "Renewing Soon".
- A renewal today is flagged and counted.
- Past renewal dates are neither flagged nor counted as upcoming.
- An empty subscription list shows a dedicated empty state.
- Invalid input is rejected by the backend with a specific message.
- A failed or unreachable API surfaces a readable error with a retry action.

## Implementation Notes

**A deliberate reading of the brief.** Section 4 scopes the *upcoming renewals count*
to active subscriptions, while section 6 applies the *warning badge* to "every
subscription". These are implemented exactly as written: a paused subscription due in
three days shows the badge but is not included in the count.

**Currency.** The app tracks a single currency, INR, defined once as
`SUPPORTED_CURRENCY` in `calculationService.js`. Any other currency is rejected at
validation, and the form shows the field as read-only.

This is deliberate. Adding costs denominated in different currencies without exchange
rates produces a meaningless total — ₹649 plus $12 is not 661 of anything. Rejecting
mixed currencies keeps the burn rate correct instead of quietly wrong. Supporting them
properly would need an FX rate source, a base currency, and a caching policy for stale
rates, none of which the brief calls for.

**Accessibility.** The toggle is a real `role="switch"` with `aria-checked`, form errors
are associated via `aria-describedby`, toasts announce through an `aria-live` region,
and animations respect `prefers-reduced-motion`.

**Responsive layout.** Above 880px the subscriptions render as a table; below that each
row collapses into a labelled card, so no horizontal scrolling is needed on a phone.

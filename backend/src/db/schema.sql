CREATE TABLE IF NOT EXISTS subscriptions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name      TEXT    NOT NULL,
  cost              REAL    NOT NULL CHECK (cost > 0),
  currency          TEXT    NOT NULL DEFAULT 'INR',
  billing_cycle     TEXT    NOT NULL CHECK (billing_cycle IN ('Monthly', 'Yearly')),
  -- Stored as YYYY-MM-DD. A date-only value keeps day arithmetic free of
  -- timezone drift, which the "renewing within 7 days" rule depends on.
  next_renewal_date TEXT    NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Paused')),
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal ON subscriptions (next_renewal_date);

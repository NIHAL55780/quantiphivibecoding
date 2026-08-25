import { getDatabase } from '../db/connection.js';

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

/**
 * Translates a database row into the camelCase shape used by the rest of the
 * application. Keeping this mapping here means no other module depends on the
 * database's column naming or on SQLite specifically.
 */
function toDomain(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    serviceName: row.service_name,
    cost: row.cost,
    currency: row.currency,
    billingCycle: row.billing_cycle,
    nextRenewalDate: row.next_renewal_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findAll() {
  const rows = getDatabase()
    .prepare('SELECT * FROM subscriptions ORDER BY next_renewal_date ASC, id ASC')
    .all();

  return rows.map(toDomain);
}

export function findById(id) {
  const row = getDatabase().prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  return toDomain(row);
}

export function create(subscription) {
  const statement = getDatabase().prepare(`
    INSERT INTO subscriptions
      (service_name, cost, currency, billing_cycle, next_renewal_date, status)
    VALUES
      (@serviceName, @cost, @currency, @billingCycle, @nextRenewalDate, @status)
  `);

  const result = statement.run(subscription);
  return findById(result.lastInsertRowid);
}

export function updateStatus(id, status) {
  const statement = getDatabase().prepare(
    `UPDATE subscriptions SET status = ?, updated_at = ${NOW} WHERE id = ?`,
  );

  const result = statement.run(status, id);
  return result.changes > 0 ? findById(id) : null;
}

export function remove(id) {
  const result = getDatabase().prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
  return result.changes > 0;
}

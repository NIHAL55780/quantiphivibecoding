const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/**
 * Single entry point for every backend call. Unwraps the `{ success, data }`
 * envelope and turns any failure into an Error carrying a message that is safe
 * to show the user directly.
 */
async function request(path, { method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Check that the backend is running.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The server returned an unexpected response (${response.status}).`);
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `Request failed with status ${response.status}.`);
  }

  return payload.data;
}

export function fetchSubscriptions() {
  return request('/subscriptions');
}

export function fetchDashboardMetrics() {
  return request('/dashboard/metrics');
}

export function createSubscription(subscription) {
  return request('/subscriptions', { method: 'POST', body: subscription });
}

export function updateSubscriptionStatus(id, status) {
  return request(`/subscriptions/${id}/status`, { method: 'PATCH', body: { status } });
}

export function deleteSubscription(id) {
  return request(`/subscriptions/${id}`, { method: 'DELETE' });
}

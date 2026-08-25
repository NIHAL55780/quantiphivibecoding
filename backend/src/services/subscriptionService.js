import * as subscriptionRepository from '../repositories/subscriptionRepository.js';
import { ApiError } from '../utils/ApiError.js';
import { getToday } from '../utils/dates.js';
import {
  calculateMetrics,
  enrichSubscription,
  enrichSubscriptions,
} from './calculationService.js';

export function listSubscriptions() {
  return enrichSubscriptions(subscriptionRepository.findAll(), getToday());
}

export function getDashboardMetrics() {
  return calculateMetrics(subscriptionRepository.findAll(), getToday());
}

/**
 * Mutations return the affected subscription alongside recalculated metrics so
 * the dashboard can reflect a change in one round trip, without the client
 * recomputing totals itself.
 */
function withMetrics(subscription) {
  return { subscription, metrics: getDashboardMetrics() };
}

export function createSubscription(payload) {
  const created = subscriptionRepository.create(payload);
  return withMetrics(enrichSubscription(created, getToday()));
}

export function changeSubscriptionStatus(id, status) {
  const updated = subscriptionRepository.updateStatus(id, status);

  if (!updated) {
    throw ApiError.notFound(`Subscription with id ${id} was not found`);
  }

  return withMetrics(enrichSubscription(updated, getToday()));
}

export function deleteSubscription(id) {
  const wasRemoved = subscriptionRepository.remove(id);

  if (!wasRemoved) {
    throw ApiError.notFound(`Subscription with id ${id} was not found`);
  }

  return { metrics: getDashboardMetrics() };
}

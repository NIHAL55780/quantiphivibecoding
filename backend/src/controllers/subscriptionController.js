import * as subscriptionService from '../services/subscriptionService.js';
import { sendSuccess } from '../utils/response.js';
import { validateCreateSubscription, validateId, validateStatus } from '../utils/validation.js';

export function listSubscriptions(req, res) {
  sendSuccess(res, subscriptionService.listSubscriptions());
}

export function getDashboardMetrics(req, res) {
  sendSuccess(res, subscriptionService.getDashboardMetrics());
}

export function createSubscription(req, res) {
  const payload = validateCreateSubscription(req.body);
  sendSuccess(res, subscriptionService.createSubscription(payload), 201);
}

export function updateSubscriptionStatus(req, res) {
  const id = validateId(req.params.id);
  const status = validateStatus(req.body?.status);
  sendSuccess(res, subscriptionService.changeSubscriptionStatus(id, status));
}

export function deleteSubscription(req, res) {
  const id = validateId(req.params.id);
  sendSuccess(res, subscriptionService.deleteSubscription(id));
}

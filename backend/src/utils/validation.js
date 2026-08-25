import { ApiError } from './ApiError.js';
import { isValidDateOnly } from './dates.js';
import { BILLING_CYCLES, STATUSES, roundCurrency } from '../services/calculationService.js';

const MAX_SERVICE_NAME_LENGTH = 100;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const DEFAULT_CURRENCY = 'INR';

function validateServiceName(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ApiError.badRequest('Service name is required');
  }

  const serviceName = value.trim();
  if (serviceName.length > MAX_SERVICE_NAME_LENGTH) {
    throw ApiError.badRequest(
      `Service name must be ${MAX_SERVICE_NAME_LENGTH} characters or fewer`,
    );
  }

  return serviceName;
}

function validateCost(value) {
  if (value === undefined || value === null || value === '') {
    throw ApiError.badRequest('Cost is required');
  }

  const cost = Number(value);
  if (!Number.isFinite(cost)) {
    throw ApiError.badRequest('Cost must be a valid number');
  }

  if (cost <= 0) {
    throw ApiError.badRequest('Cost must be greater than 0');
  }

  return roundCurrency(cost);
}

function validateCurrency(value) {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_CURRENCY;
  }

  const currency = String(value).trim().toUpperCase();
  if (!CURRENCY_CODE_PATTERN.test(currency)) {
    throw ApiError.badRequest('Currency must be a 3-letter code such as INR or USD');
  }

  return currency;
}

function validateBillingCycle(value) {
  if (!BILLING_CYCLES.includes(value)) {
    throw ApiError.badRequest(`Billing cycle must be one of: ${BILLING_CYCLES.join(', ')}`);
  }

  return value;
}

function validateRenewalDate(value) {
  if (value === undefined || value === null || value === '') {
    throw ApiError.badRequest('Next renewal date is required');
  }

  if (!isValidDateOnly(value)) {
    throw ApiError.badRequest('Next renewal date must be a valid date in YYYY-MM-DD format');
  }

  return value;
}

export function validateStatus(value, { required = true } = {}) {
  if (!required && (value === undefined || value === null || value === '')) {
    return 'Active';
  }

  if (!STATUSES.includes(value)) {
    throw ApiError.badRequest(`Status must be one of: ${STATUSES.join(', ')}`);
  }

  return value;
}

export function validateCreateSubscription(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw ApiError.badRequest('Request body must be a JSON object');
  }

  return {
    serviceName: validateServiceName(body.serviceName),
    cost: validateCost(body.cost),
    currency: validateCurrency(body.currency),
    billingCycle: validateBillingCycle(body.billingCycle),
    nextRenewalDate: validateRenewalDate(body.nextRenewalDate),
    status: validateStatus(body.status, { required: false }),
  };
}

export function validateId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest('Subscription id must be a positive integer');
  }

  return id;
}

/**
 * Presentation helpers only. Every value passed in here is already calculated by
 * the backend; these functions decide how it is displayed, never what it is.
 */

export function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateOnly) {
  if (!dateOnly) {
    return '—';
  }

  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function describeDaysRemaining(daysRemaining) {
  if (daysRemaining === null || daysRemaining === undefined) {
    return '';
  }

  if (daysRemaining < 0) {
    const overdueBy = Math.abs(daysRemaining);
    return `${overdueBy} ${overdueBy === 1 ? 'day' : 'days'} ago`;
  }

  if (daysRemaining === 0) {
    return 'Today';
  }

  return `in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`;
}

export function todayAsDateOnly() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

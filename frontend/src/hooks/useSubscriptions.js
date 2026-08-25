import { useCallback, useEffect, useState } from 'react';

import * as api from '../services/api.js';

/**
 * Mirrors the ordering the API uses, so a newly added row lands in the same
 * position it would occupy after a refetch.
 */
function byRenewalDate(a, b) {
  if (a.nextRenewalDate === b.nextRenewalDate) {
    return a.id - b.id;
  }
  return a.nextRenewalDate < b.nextRenewalDate ? -1 : 1;
}

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [pendingIds, setPendingIds] = useState(() => new Set());

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [nextSubscriptions, nextMetrics] = await Promise.all([
        api.fetchSubscriptions(),
        api.fetchDashboardMetrics(),
      ]);

      setSubscriptions(nextSubscriptions);
      setMetrics(nextMetrics);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markPending = useCallback((id, isPending) => {
    setPendingIds((previous) => {
      const next = new Set(previous);
      if (isPending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const addSubscription = useCallback(async (input) => {
    const { subscription, metrics: nextMetrics } = await api.createSubscription(input);

    setSubscriptions((previous) => [...previous, subscription].sort(byRenewalDate));
    setMetrics(nextMetrics);

    return subscription;
  }, []);

  const changeStatus = useCallback(
    async (id, status) => {
      markPending(id, true);

      try {
        const { subscription, metrics: nextMetrics } = await api.updateSubscriptionStatus(
          id,
          status,
        );

        setSubscriptions((previous) =>
          previous.map((item) => (item.id === id ? subscription : item)),
        );
        setMetrics(nextMetrics);

        return subscription;
      } finally {
        markPending(id, false);
      }
    },
    [markPending],
  );

  const removeSubscription = useCallback(
    async (id) => {
      markPending(id, true);

      try {
        const { metrics: nextMetrics } = await api.deleteSubscription(id);

        setSubscriptions((previous) => previous.filter((item) => item.id !== id));
        setMetrics(nextMetrics);
      } finally {
        markPending(id, false);
      }
    },
    [markPending],
  );

  return {
    subscriptions,
    metrics,
    isLoading,
    loadError,
    pendingIds,
    reload: load,
    addSubscription,
    changeStatus,
    removeSubscription,
  };
}

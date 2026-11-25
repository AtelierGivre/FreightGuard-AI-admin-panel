'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Small reusable data-fetching hook used by every page.
 *
 * Handles loading / error state and exposes `reload()` for after mutations.
 * The fetcher is kept in a ref (updated in an effect) so pages may pass an
 * inline arrow function without causing an infinite re-render loop.
 *
 * @param {() => Promise<any>} fetcher Resolves to an API envelope (`{ data }`)
 * @param {Array} deps Values that should trigger a refetch (e.g. [invoiceId])
 */
export function useApiData(fetcher, deps = []) {
  const fetcherRef = useRef(fetcher);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [envelope, setEnvelope] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetcherRef.current();
      setEnvelope(result);
      setMeta(result?.meta ?? null);
      setData(result?.data ?? result ?? null);
      return result;
    } catch (err) {
      setError(err.message || 'Unable to load data');
      setMeta(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Defer state updates out of the effect body so React can batch them.
      await Promise.resolve();
      if (!cancelled) await reload();
    };

    run();
    return () => {
      cancelled = true;
    };
    // Refetch triggers are supplied by the caller, not inferred from the fetcher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, meta, envelope, loading, error, reload, setData };
}

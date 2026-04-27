import { useEffect, useMemo, useState } from 'react';

/**
 * Lightweight client-side pagination for already-fetched lists.
 * Use when the dataset is in memory (filtered transactions, customers, etc.).
 * Resets to page 1 whenever the input length or pageSize changes — so changing
 * filters/search doesn't leave the user stranded on an empty page.
 */
export function usePagination<T>(items: T[], initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Snap to a valid page when filters shrink the dataset
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return {
    page,
    pageSize,
    pageCount,
    total,
    from,
    to,
    pageItems,
    setPage,
    setPageSize: (n: number) => {
      setPageSize(n);
      setPage(1);
    },
    next: () => setPage((p) => Math.min(pageCount, p + 1)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    canPrev: page > 1,
    canNext: page < pageCount,
  };
}

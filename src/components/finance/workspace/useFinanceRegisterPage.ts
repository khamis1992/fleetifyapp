import { useEffect, useState } from 'react';

export function useFinanceRegisterPage<T>(rows: T[], resetKey: string, size = 25) {
  const [requestedPage, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [resetKey]);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(requestedPage, pages);
  return { rows: rows.slice((page - 1) * size, page * size), page, pages, total: rows.length, size, setPage };
}

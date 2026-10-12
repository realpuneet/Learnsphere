import { useInfiniteQuery } from '@tanstack/react-query';
import { get } from '../lib/api.js';

/** Cursor-paginated list (patient facing infinite scroll). */
export function useCursorList(key, url, params = {}, options = {}) {
  const q = useInfiniteQuery({
    queryKey: [key, params],
    queryFn: ({ pageParam }) => get(url, { ...params, cursor: pageParam || undefined }),
    initialPageParam: null,
    getNextPageParam: (last) => last.meta?.nextCursor || undefined,
    ...options,
  });
  return { ...q, items: q.data?.pages.flatMap((p) => p.data) || [] };
}

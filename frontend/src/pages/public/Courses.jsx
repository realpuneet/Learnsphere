import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import { get } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select } from '../../components/ui/Form.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { Drawer } from '../../components/ui/Overlay.jsx';
import { CourseGrid } from '../../components/common/CourseCard.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { LEVEL_LABEL } from '../../lib/format.js';

const SORTS = [['popular', 'Most popular'], ['newest', 'Newest'], ['rating', 'Highest rated'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low']];

export default function Courses() {
  const [sp, setSp] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(sp.get('q') || '');
  const dText = useDebounce(text);

  const set = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: true });
  };

  // keep the URL in step with the debounced search box
  useEffect(() => {
    if ((sp.get('q') || '') !== dText) set({ q: dText });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dText]);

  const params = {
    q: sp.get('q') || undefined, category: sp.get('category') || undefined, level: sp.get('level') || undefined, price: sp.get('price') || undefined,
    sort: sp.get('sort') || undefined, minRating: sp.get('minRating') || undefined, featured: sp.get('featured') || undefined, page: Number(sp.get('page')) || 1, limit: 12,
  };
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => get('/categories'), staleTime: 300_000 });
  const q = useQuery({ queryKey: ['courses', params], queryFn: () => get('/courses', params), placeholderData: keepPreviousData });
  const active = ['category', 'level', 'price', 'minRating', 'featured'].filter((k) => sp.get(k));

  const filters = (
    <div className="space-y-4">
      <Select label="Category" value={sp.get('category') || ''} onChange={(e) => set({ category: e.target.value })}>
        <option value="">All categories</option>
        {(cats.data?.data || []).map((c) => <option key={c._id} value={c.slug}>{c.name} ({c.courseCount})</option>)}
      </Select>
      <Select label="Level" value={sp.get('level') || ''} onChange={(e) => set({ level: e.target.value })}>
        <option value="">Any level</option>
        {Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
      <Select label="Price" value={sp.get('price') || ''} onChange={(e) => set({ price: e.target.value })}>
        <option value="">Free and paid</option><option value="free">Free</option><option value="paid">Paid</option>
      </Select>
      <Select label="Rating" value={sp.get('minRating') || ''} onChange={(e) => set({ minRating: e.target.value })}>
        <option value="">Any rating</option><option value="4.5">4.5 & up</option><option value="4">4.0 & up</option><option value="3">3.0 & up</option>
      </Select>
      {active.length > 0 && <Button variant="ghost" size="sm" onClick={() => set({ category: '', level: '', price: '', minRating: '', featured: '' })}><X className="h-4 w-4" /> Clear filters</Button>}
    </div>
  );

  return (
    <div className="container py-6 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Explore courses</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input aria-label="Search courses" placeholder="Search by title, topic or tag…" className="pl-9" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <Select aria-label="Sort" wrapperClass="w-48" value={sp.get('sort') || 'popular'} onChange={(e) => set({ sort: e.target.value })}>
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
        <Button variant="secondary" className="lg:hidden" onClick={() => setOpen(true)}><SlidersHorizontal className="h-4 w-4" /> Filters{active.length ? ` (${active.length})` : ''}</Button>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label="Filters">{filters}</aside>
        <div>
          {q.isLoading && <CardSkeletons count={6} className="h-64" />}
          {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
          {q.data && (q.data.data.length === 0
            ? <Empty title="No courses match" text="Try a different search or clear some filters." />
            : (<>
              <p className="mb-3 text-sm text-ink-500">{q.data.meta.total} course{q.data.meta.total === 1 ? '' : 's'}</p>
              <CourseGrid courses={q.data.data} className="xl:grid-cols-3" />
              <Pager meta={q.data.meta} onPage={(p) => set({ page: p > 1 ? String(p) : '' })} />
            </>))}
        </div>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} side="left">
        <div className="p-5"><h2 className="mb-4 font-display text-lg font-bold">Filters</h2>{filters}<Button className="mt-6 w-full" onClick={() => setOpen(false)}>Show results</Button></div>
      </Drawer>
    </div>
  );
}

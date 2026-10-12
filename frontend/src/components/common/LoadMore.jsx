import { Button } from '../ui/Button.jsx';

export function LoadMore({ query }) {
  if (!query.hasNextPage) return null;
  return (
    <div className="mt-5 flex justify-center">
      <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Load more</Button>
    </div>
  );
}

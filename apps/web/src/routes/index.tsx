import { createFileRoute } from '@tanstack/react-router';
import { ModelGrid } from '@/components/models/model-grid';

export const Route = createFileRoute('/')({
  component: HomeComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    search: typeof search.search === 'string' ? search.search : '',
    tags: Array.isArray(search.tags) ? (search.tags as string[]) : [],
  }),
});

function HomeComponent() {
  const { search, tags } = Route.useSearch();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="mb-2 font-bold text-3xl">STL Shelf</h1>
        <p className="text-muted-foreground">
          Your personal 3D model library, organized and versioned.
        </p>
      </div>

      <ModelGrid searchQuery={search} selectedTags={tags} />
    </div>
  );
}

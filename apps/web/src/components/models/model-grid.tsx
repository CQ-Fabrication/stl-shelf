import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { orpc } from '@/utils/orpc';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { ModelCard } from './model-card';
import { ModelSearch } from './model-search';

type ModelGridProps = {
  searchQuery?: string;
  selectedTags?: string[];
};

export function ModelGrid({
  searchQuery = '',
  selectedTags = [],
}: ModelGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<
    'name' | 'createdAt' | 'updatedAt' | 'size'
  >('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    data: modelsData,
    isLoading,
    error,
  } = useQuery(
    orpc.listModels.queryOptions({
      input: {
        page: currentPage,
        limit: 12,
        search: searchQuery || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        sortBy,
        sortOrder,
      },
    })
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (
    newSortBy: typeof sortBy,
    newSortOrder: typeof sortOrder
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mb-2 text-destructive">Failed to load models</div>
        <div className="text-muted-foreground text-sm">{error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with search and actions */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="w-full flex-1 sm:w-auto">
          <ModelSearch
            defaultSearch={searchQuery}
            defaultTags={selectedTags}
            onSearchChange={(_search, _tags) => {
              // This would trigger a parent state update in a real implementation
              // For now, we'll handle this via URL params
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/upload">
              <Plus className="mr-2 h-4 w-4" />
              Upload Model
            </Link>
          </Button>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sort by:</span>
        <div className="flex gap-1">
          {(
            [
              { key: 'updatedAt', label: 'Recently Updated' },
              { key: 'createdAt', label: 'Recently Created' },
              { key: 'name', label: 'Name' },
              { key: 'size', label: 'Size' },
            ] as const
          ).map(({ key, label }) => (
            <Button
              key={key}
              onClick={() =>
                handleSortChange(
                  key,
                  sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc'
                )
              }
              size="sm"
              variant={sortBy === key ? 'default' : 'ghost'}
            >
              {label}
              {sortBy === key && (
                <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Results summary */}
      {modelsData && (
        <div className="text-muted-foreground text-sm">
          Showing{' '}
          {(modelsData.pagination.page - 1) * modelsData.pagination.limit + 1}-
          {Math.min(
            modelsData.pagination.page * modelsData.pagination.limit,
            modelsData.pagination.total
          )}{' '}
          of {modelsData.pagination.total} models
        </div>
      )}

      {/* Models grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="space-y-4" key={i}>
              <Skeleton className="aspect-video rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : modelsData?.models.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mb-4 text-muted-foreground">No models found</div>
          {searchQuery || selectedTags.length > 0 ? (
            <div className="space-y-2">
              <div className="text-muted-foreground text-sm">
                Try adjusting your search or filters
              </div>
              <Button
                onClick={() => {
                  // Reset search - in real implementation this would update URL params
                  setCurrentPage(1);
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <Button asChild>
              <Link to="/upload">
                <Plus className="mr-2 h-4 w-4" />
                Upload Your First Model
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {modelsData?.models.map((model) => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {modelsData && modelsData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <Button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            size="sm"
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-1">
            {Array.from(
              { length: Math.min(5, modelsData.pagination.totalPages) },
              (_, i) => {
                const page = i + 1;
                // Smart pagination: show first, current-1, current, current+1, last
                let displayPage = page;
                if (modelsData.pagination.totalPages > 5) {
                  if (currentPage <= 3) {
                    displayPage = page;
                  } else if (
                    currentPage >=
                    modelsData.pagination.totalPages - 2
                  ) {
                    displayPage = modelsData.pagination.totalPages - 4 + page;
                  } else {
                    displayPage = currentPage - 2 + page;
                  }
                }

                return (
                  <Button
                    className="min-w-[40px]"
                    key={displayPage}
                    onClick={() => handlePageChange(displayPage)}
                    size="sm"
                    variant={
                      currentPage === displayPage ? 'default' : 'outline'
                    }
                  >
                    {displayPage}
                  </Button>
                );
              }
            )}
          </div>

          <Button
            disabled={currentPage === modelsData.pagination.totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            size="sm"
            variant="outline"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

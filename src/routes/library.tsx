import { createFileRoute } from '@tanstack/react-router'
import { ModelGrid } from '@/components/models/model-grid'
import { SearchFilterBar } from '@/components/models/search-filter-bar'
import { useHasModels } from '@/hooks/use-has-models'

export const Route = createFileRoute('/library')({
  component: LibraryPage,
})

function LibraryPage() {
  const { hasModels, isLoading } = useHasModels()

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="mb-2 font-bold text-3xl">My Library</h1>
        <p className="text-muted-foreground">
          Your personal 3D model library, organized and versioned.
        </p>
      </div>

      <div className="space-y-6">
        {!isLoading && hasModels && <SearchFilterBar />}
        <ModelGrid />
      </div>
    </div>
  )
}

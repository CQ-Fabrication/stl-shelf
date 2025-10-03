import { createFileRoute } from "@tanstack/react-router";
import { ModelGrid } from "@/components/models/model-grid";
import { SearchFilterBar } from "@/components/models/search-filter-bar";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="mb-2 font-bold text-3xl">STL Shelf</h1>
        <p className="text-muted-foreground">
          Your personal 3D model library, organized and versioned.
        </p>
      </div>

      <div className="space-y-6">
        <SearchFilterBar />
        <ModelGrid />
      </div>
    </div>
  );
}

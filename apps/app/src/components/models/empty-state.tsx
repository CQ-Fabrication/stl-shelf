type EmptyStateProps = {
  hasFilters: boolean;
};

export function EmptyState({ hasFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-muted-foreground">No models found</div>
        <div className="text-muted-foreground text-sm">
          Try adjusting your search or filters
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 text-center">
      <div className="mb-4 text-muted-foreground">No models found</div>
      <div className="text-muted-foreground">
        No models found. Upload your first model using the button above.
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/skeleton';

export const ModelDetailSkeleton = () => {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-video" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
};

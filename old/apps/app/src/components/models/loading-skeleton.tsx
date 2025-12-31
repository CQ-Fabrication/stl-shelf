import { Skeleton } from "@stl-shelf/ui/components/skeleton";

const SKELETON_COUNT = 8;
const SKELETON_KEYS = Array.from(
  { length: SKELETON_COUNT },
  (_, i) => `sk-${i}`
);

export function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {SKELETON_KEYS.map((key) => (
        <div className="space-y-4" key={key}>
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
  );
}

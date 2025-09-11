import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertCircle, Download, History, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { downloadAllFiles } from '@/utils/download';
import { formatDate } from '@/utils/formatters';
import { client } from '@/utils/orpc';
import type { Model } from '../../../../server/src/types/model';

type ModelVersionHistoryProps = {
  model: Model;
  activeVersion: string;
  onVersionSelect: (version: string) => void;
};

export const ModelVersionHistory = ({
  model,
  activeVersion,
  onVersionSelect,
}: ModelVersionHistoryProps) => {
  const LIMIT = 5;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['modelVersions', model.id, LIMIT],
    queryFn: async ({ pageParam = 0, signal }) => {
      const result = await client.getModelVersions(
        { modelId: model.id, offset: pageParam, limit: LIMIT },
        { signal }
      );
      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.hasMore) return;
      const loaded = allPages.reduce(
        (sum, p) => sum + (p?.versions?.length ?? 0),
        0
      );
      return loaded;
    },
  });

  // Flatten all pages into a single array of versions
  const versions = data?.pages?.flatMap((page) => page.versions ?? []) ?? [];
  const totalVersions = data?.pages?.[0]?.total ?? model.totalVersions;

  // Setup intersection observer for infinite scroll
  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Trigger fetch when scrolling near the bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
        <CardDescription>
          {totalVersions} version{totalVersions !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error?.message ?? 'Failed to load version history'}
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea aria-label="Version history" className="h-80">
          <div className="space-y-3 pr-2">
            {isLoading && (
              <div
                aria-busy="true"
                className="flex items-center justify-center py-8"
              >
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-muted-foreground text-sm">
                  Loading versions...
                </span>
              </div>
            )}

            {!isLoading && versions.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No versions available
              </div>
            )}

            {!isLoading && versions.length > 0 && (
              <>
                {versions.map((version, index) => (
                  <div
                    className="flex items-start justify-between rounded border p-3"
                    key={`${version.version}-${index}`}
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge
                          variant={
                            version.version === activeVersion
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {version.version}
                        </Badge>
                        {version.version === activeVersion && (
                          <Badge className="text-xs" variant="secondary">
                            Active
                          </Badge>
                        )}
                        {index === 0 && version.version !== activeVersion && (
                          <Badge className="text-xs" variant="outline">
                            Latest
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {formatDate(version.createdAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onVersionSelect(version.version)}
                        size="sm"
                        variant={
                          version.version === activeVersion
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {version.version === activeVersion ? 'Viewing' : 'View'}
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            await downloadAllFiles(
                              model.id,
                              version.version,
                              version.files
                            );
                            toast.success('Download started');
                          } catch {
                            toast.error('Download failed');
                          }
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Intersection observer target */}
                {hasNextPage && (
                  <div
                    className="flex items-center justify-center py-4"
                    ref={inViewRef}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2 text-muted-foreground text-sm">
                          Loading more...
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Scroll for more
                      </span>
                    )}
                  </div>
                )}

                {!hasNextPage && versions.length > 0 && (
                  <div className="py-2 text-center text-muted-foreground text-xs">
                    All versions loaded
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

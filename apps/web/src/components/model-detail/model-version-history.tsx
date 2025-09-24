import { Download, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { Skeleton } from '@/components/ui/skeleton';
import { downloadAllFiles } from '@/utils/download';
import { formatDate } from '@/utils/formatters';
import { orpc } from '@/utils/orpc';

type ModelVersionHistoryProps = {
  modelId: string;
  activeVersion?: string;
  onVersionSelect: (versionId: string) => void;
};

export const ModelVersionHistory = ({
  modelId,
  activeVersion,
  onVersionSelect,
}: ModelVersionHistoryProps) => {
  const { data: versions, isLoading, error } = useQuery(
    orpc.models.getModelVersions.queryOptions({ input: { modelId } })
  );
  const { data: model } = useQuery(
    orpc.models.getModel.queryOptions({ input: { id: modelId } })
  );

  const totalVersions = model?.totalVersions ?? 0;

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
        <ScrollArea aria-label="Version history" className="h-80">
          <div className="space-y-3 pr-2">
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start justify-between rounded border p-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Failed to load version history
              </div>
            )}

            {!isLoading && !error && versions?.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No versions available
              </div>
            )}

            {!isLoading && versions && versions.length > 0 && (
              <>
                {versions.map((version, index) => (
                  <div
                    className="flex items-start justify-between rounded border p-3"
                    key={version.id}
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge
                          variant={
                            version.id === activeVersion
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {version.version}
                        </Badge>
                        {version.id === activeVersion && (
                          <Badge className="text-xs" variant="secondary">
                            Active
                          </Badge>
                        )}
                        {index === 0 && version.id !== activeVersion && (
                          <Badge className="text-xs" variant="outline">
                            Latest
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {formatDate(new Date(version.createdAt))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onVersionSelect(version.id)}
                        size="sm"
                        variant={
                          version.id === activeVersion
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {version.id === activeVersion ? 'Viewing' : 'View'}
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            await downloadAllFiles(
                              modelId,
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
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
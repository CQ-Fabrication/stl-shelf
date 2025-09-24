import {
  Box,
  Calendar,
  Download,
  FileText,
  HardDrive,
  Tag,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadFile } from '@/utils/download';
import {
  formatDate,
  formatFileSize,
  formatPrintTime,
} from '@/utils/formatters';
import { orpc } from '@/utils/orpc';

type ModelInfoCardProps = {
  modelId: string;
  versionId?: string;
};

export const ModelInfoCard = ({
  modelId,
  versionId,
}: ModelInfoCardProps) => {
  const { data: model } = useQuery(
    orpc.models.getModel.queryOptions({ input: { id: modelId } })
  );
  const { data: stats, isLoading: statsLoading } = useQuery(
    orpc.models.getModelStatistics.queryOptions({ input: { id: modelId } })
  );
  const { data: tags } = useQuery(
    orpc.models.getModelTags.queryOptions({ input: { id: modelId } })
  );
  const { data: files } = useQuery({
    ...orpc.models.getModelFiles.queryOptions({
      input: { modelId, versionId: versionId! },
    }),
    enabled: !!versionId,
  });
  const { data: versions } = useQuery(
    orpc.models.getModelVersions.queryOptions({ input: { modelId } })
  );

  const activeVersion = versionId
    ? versions?.find((v) => v.id === versionId)
    : versions?.[0];

  const printSettings = activeVersion?.printSettings;

  const getFileIcon = (extension: string) => {
    const ext = extension.toLowerCase();
    if (['.stl', '.3mf', '.obj', '.ply'].includes(ext)) {
      return Box;
    }
    return FileText;
  };

  const handleDownloadFile = async (filename: string) => {
    if (!activeVersion) return;

    try {
      await downloadFile(modelId, activeVersion.version, filename);
      toast.success(`Downloading ${filename}`);
    } catch {
      toast.error(`Failed to download ${filename}`);
    }
  };

  if (statsLoading || !model) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Model Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Created</div>
              <div className="text-muted-foreground">
                {model.createdAt ? formatDate(new Date(model.createdAt)) : 'N/A'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Size</div>
              <div className="text-muted-foreground">
                {stats ? formatFileSize(stats.totalSize) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Available Files */}
        {files && files.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Available Files</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {files
                .filter((file) =>
                  ['.stl', '.3mf', '.obj', '.ply'].includes(
                    file.extension.toLowerCase()
                  )
                )
                .map((file) => {
                  const Icon = getFileIcon(file.extension);
                  return (
                    <div
                      className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1"
                      key={file.filename}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Badge className="text-xs" variant="secondary">
                        {file.extension.slice(1).toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatFileSize(file.size)}
                      </span>
                      <Button
                        className="h-6 w-6"
                        onClick={() => handleDownloadFile(file.filename)}
                        size="icon"
                        title={`Download ${file.filename}`}
                        variant="ghost"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Print Settings */}
        {printSettings && (
          <div>
            <div className="mb-2 font-medium text-sm">Print Settings</div>
            <div className="space-y-1 text-muted-foreground text-sm">
              {printSettings.material && (
                <div>Material: {printSettings.material}</div>
              )}
              {printSettings.layerHeight && (
                <div>Layer Height: {printSettings.layerHeight}mm</div>
              )}
              {printSettings.infill && (
                <div>Infill: {printSettings.infill}%</div>
              )}
              {printSettings.printTime && (
                <div>
                  Print Time: {formatPrintTime(printSettings.printTime)}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

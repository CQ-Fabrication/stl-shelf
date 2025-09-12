import {
  Box,
  Calendar,
  Download,
  FileText,
  HardDrive,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { downloadFile } from '@/utils/download';
import {
  formatDate,
  formatFileSize,
  formatPrintTime,
} from '@/utils/formatters';
import type { Model, ModelVersion } from '../../../../server/src/types/model';

type ModelInfoCardProps = {
  model: Model;
  totalSize: number;
  activeVersion?: ModelVersion;
};

export const ModelInfoCard = ({
  model,
  totalSize,
  activeVersion,
}: ModelInfoCardProps) => {
  const { printSettings } = model.latestMetadata;

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
      await downloadFile(model.id, activeVersion.version, filename);
      toast.success(`Downloading ${filename}`);
    } catch {
      toast.error(`Failed to download ${filename}`);
    }
  };
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
                {formatDate(model.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Size</div>
              <div className="text-muted-foreground">
                {formatFileSize(totalSize)}
              </div>
            </div>
          </div>
        </div>

        {/* Available Files */}
        {activeVersion && activeVersion.files.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Available Files</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeVersion.files
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
        {model.latestMetadata.tags.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {model.latestMetadata.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
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

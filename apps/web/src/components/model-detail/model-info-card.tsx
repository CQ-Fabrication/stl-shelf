import { Calendar, HardDrive, Tag } from 'lucide-react';
import type { Model } from '../../../../server/src/types/model';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatDate, formatFileSize, formatPrintTime } from '@/utils/formatters';

type ModelInfoCardProps = {
  model: Model;
  totalSize: number;
};

export const ModelInfoCard = ({ model, totalSize }: ModelInfoCardProps) => {
  const { printSettings } = model.latestMetadata;

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
                <div>Print Time: {formatPrintTime(printSettings.printTime)}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

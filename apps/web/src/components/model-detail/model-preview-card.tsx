import { FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { STLViewerWithSuspense } from '@/components/viewer/stl-viewer';
import type {
  ModelFile,
  ModelVersion,
} from '../../../../server/src/types/model';

type ModelPreviewCardProps = {
  modelId: string;
  version: ModelVersion;
  mainModelFile?: ModelFile;
};

export const ModelPreviewCard = ({
  modelId,
  version,
  mainModelFile,
}: ModelPreviewCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>3D Preview</CardTitle>
        <CardDescription>
          Interactive 3D view of {version.version}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {mainModelFile && mainModelFile.downloadUrl ? (
          <div className="aspect-video">
            <STLViewerWithSuspense
              className="h-full w-full overflow-hidden rounded-b-lg"
              filename={mainModelFile.filename}
              modelId={modelId}
              version={version.version}
              url={mainModelFile.downloadUrl}
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-b-lg bg-muted">
            <div className="text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-12 w-12" />
              <div>No 3D file available for preview</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

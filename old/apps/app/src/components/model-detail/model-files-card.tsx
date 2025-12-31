import { Download, FileText } from "lucide-react";
import { Badge } from "@stl-shelf/ui/components/badge";
import { Button } from "@stl-shelf/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@stl-shelf/ui/components/card";
import { formatFileSize } from "@/utils/formatters";
import type { ModelVersion } from "../../../../server/src/types/model";

type ModelFilesCardProps = {
  version: ModelVersion;
  onDownloadFile: (filename: string) => void;
};

export const ModelFilesCard = ({
  version,
  onDownloadFile,
}: ModelFilesCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Files ({version.version})</CardTitle>
        <CardDescription>
          {version.files.length} file{version.files.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {version.files.map((file) => (
            <div
              className="flex items-center justify-between rounded border p-2"
              key={file.filename}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">{file.filename}</div>
                  <div className="text-muted-foreground text-xs">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs" variant="outline">
                  {file.extension.slice(1).toUpperCase()}
                </Badge>
                <Button
                  onClick={() => onDownloadFile(file.filename)}
                  size="sm"
                  variant="ghost"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

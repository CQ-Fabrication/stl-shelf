import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Calendar,
  FileText,
  HardDrive,
  ImageIcon,
  Tag,
} from "lucide-react";
import { Badge } from "@stl-shelf/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@stl-shelf/ui/components/card";
import { Skeleton } from "@stl-shelf/ui/components/skeleton";
import { formatDate, formatFileSize } from "@/utils/formatters";
import { orpc } from "@/utils/orpc";

type ModelInfoCardProps = {
  modelId: string;
  versionId?: string;
};

export const ModelInfoCard = ({ modelId, versionId }: ModelInfoCardProps) => {
  const { data: model } = useQuery(
    orpc.models.getModel.queryOptions({ input: { id: modelId } })
  );
  const { isLoading: statsLoading } = useQuery(
    orpc.models.getModelStatistics.queryOptions({ input: { id: modelId } })
  );
  const { data: tags } = useQuery(
    orpc.models.getModelTags.queryOptions({ input: { id: modelId } })
  );
  const { data: files } = useQuery({
    ...orpc.models.getModelFiles.queryOptions({
      input: { modelId, versionId: versionId || "" },
    }),
    enabled: !!versionId,
  });
  const { data: versions } = useQuery(
    orpc.models.getModelVersions.queryOptions({ input: { modelId } })
  );

  const activeVersion = versionId
    ? versions?.find((v) => v.id === versionId)
    : versions?.[0];

  const getFileIcon = (extension: string) => {
    const ext = extension.toLowerCase();
    if (["stl", "3mf", "obj", "ply"].includes(ext)) {
      return Box;
    }
    return FileText;
  };

  const getFileTypeBadgeVariant = (
    extension: string
  ): "default" | "secondary" | "outline" | "destructive" => {
    const ext = extension.toLowerCase();
    switch (ext) {
      case "stl":
        return "default";
      case "obj":
        return "secondary";
      case "3mf":
        return "outline";
      case "ply":
        return "destructive";
      default:
        return "secondary";
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
    <Card className="shadow-sm transition-all duration-200 hover:shadow-[var(--shadow-brand)]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Model Information</span>
          {activeVersion && (
            <Badge className="font-normal" variant="outline">
              Version{" "}
              <span className="text-brand">{activeVersion.version}</span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Thumbnail Preview */}
        {activeVersion?.thumbnailUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Preview</span>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <img
                alt={`Preview of ${model.name}`}
                className="aspect-video w-full object-cover"
                height={360}
                loading="lazy"
                src={activeVersion.thumbnailUrl}
                width={640}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Version Created</div>
              <div className="text-muted-foreground">
                {activeVersion?.createdAt
                  ? formatDate(new Date(activeVersion.createdAt))
                  : "N/A"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Version Size</div>
              <div className="text-muted-foreground">
                {activeVersion?.files
                  ? formatFileSize(
                      activeVersion.files.reduce(
                        (sum, file) => sum + file.size,
                        0
                      )
                    )
                  : "N/A"}
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
                  ["stl", "3mf", "obj", "ply"].includes(
                    file.extension.toLowerCase()
                  )
                )
                .map((file) => {
                  const Icon = getFileIcon(file.extension);
                  return (
                    <div
                      className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 transition-colors hover:bg-muted/80"
                      key={file.filename}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file.originalName}</span>
                      <Badge
                        className="text-xs"
                        variant={
                          file.extension.toLowerCase() === "stl"
                            ? "default"
                            : getFileTypeBadgeVariant(file.extension)
                        }
                      >
                        {file.extension.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatFileSize(file.size)}
                      </span>
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
      </CardContent>
    </Card>
  );
};

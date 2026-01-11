import { useQuery } from "@tanstack/react-query";
import { Calendar, HardDrive, ImageIcon, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagEditor } from "@/components/model-detail/tag-editor";
import { SourceFilesSection } from "@/components/model-detail/source-files-section";
import { PrintProfilesSection } from "@/components/model-detail/print-profiles";
import { formatDate, formatFileSize } from "@/utils/formatters";
import {
  getModel,
  getModelStatistics,
  getModelTags,
  getModelFiles,
  getModelVersions,
} from "@/server/functions/models";

type ModelInfoCardProps = {
  modelId: string;
  versionId?: string;
};

export const ModelInfoCard = ({ modelId, versionId }: ModelInfoCardProps) => {
  const { data: model } = useQuery({
    queryKey: ["model", modelId],
    queryFn: () => getModel({ data: { id: modelId } }),
  });
  const { isLoading: statsLoading } = useQuery({
    queryKey: ["model", modelId, "statistics"],
    queryFn: () => getModelStatistics({ data: { id: modelId } }),
  });
  const { data: tags } = useQuery({
    queryKey: ["model", modelId, "tags"],
    queryFn: () => getModelTags({ data: { id: modelId } }),
  });
  const { data: files, refetch: refetchFiles } = useQuery({
    queryKey: ["model", modelId, "files", versionId],
    queryFn: () => getModelFiles({ data: { modelId, versionId: versionId! } }),
    enabled: !!versionId,
  });
  const { data: versions } = useQuery({
    queryKey: ["model", modelId, "versions"],
    queryFn: () => getModelVersions({ data: { modelId } }),
  });

  const activeVersion = versionId ? versions?.find((v) => v.id === versionId) : versions?.[0];

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
            <Badge className="font-normal text-brand" variant="outline">
              {activeVersion.version}
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
                {activeVersion?.createdAt ? formatDate(new Date(activeVersion.createdAt)) : "N/A"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Version Size</div>
              <div className="text-muted-foreground">
                {activeVersion?.files
                  ? formatFileSize(activeVersion.files.reduce((sum, file) => sum + file.size, 0))
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Changelog */}
        {activeVersion?.description && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">What's New</span>
              <Badge className="text-xs" variant="outline">
                {activeVersion.version}
              </Badge>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                {activeVersion.description}
              </p>
            </div>
          </div>
        )}

        {/* Files and Profiles Tabs */}
        {versionId && (
          <Tabs className="w-full" defaultValue="files">
            <TabsList>
              <TabsTrigger value="files">Source Files</TabsTrigger>
              <TabsTrigger value="profiles">Print Profiles</TabsTrigger>
            </TabsList>

            <TabsContent value="files">
              <SourceFilesSection
                files={files ?? []}
                hasThumbnail={!!activeVersion?.thumbnailUrl}
                onFilesChanged={() => refetchFiles()}
                versionId={versionId}
              />
            </TabsContent>

            <TabsContent value="profiles">
              <PrintProfilesSection versionId={versionId} />
            </TabsContent>
          </Tabs>
        )}

        {/* Tags */}
        <TagEditor currentTags={tags ?? []} modelId={modelId} />
      </CardContent>
    </Card>
  );
};

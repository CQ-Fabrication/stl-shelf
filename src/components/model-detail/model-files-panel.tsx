import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceFilesSection } from "@/components/model-detail/source-files-section";
import { getModelFiles, getModelVersions } from "@/server/functions/models";

type ModelFilesPanelProps = {
  modelId: string;
  versionId?: string;
};

export const ModelFilesPanel = ({ modelId, versionId }: ModelFilesPanelProps) => {
  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ["model", modelId, "versions"],
    queryFn: () => getModelVersions({ data: { modelId } }),
  });

  const activeVersion = versionId ? versions?.find((v) => v.id === versionId) : versions?.[0];

  const {
    data: files,
    isLoading: filesLoading,
    refetch,
  } = useQuery({
    queryKey: ["model", modelId, "files", activeVersion?.id],
    queryFn: () => getModelFiles({ data: { modelId, versionId: activeVersion!.id } }),
    enabled: !!activeVersion,
  });

  if (versionsLoading) {
    return (
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="border-border/60 border-b">
          <CardTitle className="text-base font-semibold">Source Files</CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-wide">
            Loading versions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!activeVersion) {
    return (
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="border-border/60 border-b">
          <CardTitle className="text-base font-semibold">Source Files</CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-wide">
            No version selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            Upload a version to manage files.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="border-border/60 border-b">
        <CardTitle className="text-base font-semibold">Source Files</CardTitle>
        <CardDescription className="text-muted-foreground text-xs uppercase tracking-wide">
          Active version · {activeVersion.version}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filesLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <SourceFilesSection
            files={files ?? []}
            hasThumbnail={!!activeVersion.thumbnailUrl}
            onFilesChanged={() => refetch()}
            versionId={activeVersion.id}
          />
        )}
      </CardContent>
    </Card>
  );
};

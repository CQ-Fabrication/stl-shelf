import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STLViewerWithSuspense } from "@/components/viewer/stl-viewer";
import { orpc } from "@/utils/orpc";

type ModelPreviewCardProps = {
  modelId: string;
  versionId?: string;
};

export const ModelPreviewCard = ({
  modelId,
  versionId,
}: ModelPreviewCardProps) => {
  const { data: versions } = useQuery(
    orpc.models.getModelVersions.queryOptions({ input: { modelId } })
  );
  const activeVersion = versionId
    ? versions?.find((v) => v.id === versionId)
    : versions?.[0];

  const { data: files, isLoading } = useQuery({
    ...orpc.models.getModelFiles.queryOptions({
      input: { modelId, versionId: activeVersion?.id ?? "" },
    }),
    enabled: !!activeVersion,
  });

  // Only find STL or OBJ files since the viewer only supports these formats
  const mainModelFile = files?.find((f) =>
    ["stl", "obj"].includes(f.extension.toLowerCase())
  );

  // Check if there are any 3D files at all (including unsupported ones)
  const has3DFiles = files?.some((f) =>
    ["stl", "obj", "3mf", "ply"].includes(f.extension.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>3D Preview</CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-32" />
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Skeleton className="aspect-video w-full rounded-b-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!activeVersion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>3D Preview</CardTitle>
          <CardDescription>No version available</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex aspect-video items-center justify-center rounded-b-lg bg-muted">
            <div className="text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-12 w-12" />
              <div>No version selected</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>3D Preview</CardTitle>
        <CardDescription>
          Interactive 3D view of {activeVersion.version}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {mainModelFile?.storageUrl ? (
          <div className="aspect-video">
            <STLViewerWithSuspense
              className="h-full w-full overflow-hidden rounded-b-lg"
              filename={mainModelFile.filename}
              modelId={modelId}
              url={mainModelFile.storageUrl || ""}
              version={activeVersion.version}
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-b-lg bg-muted">
            <div className="text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-12 w-12" />
              {has3DFiles ? (
                <>
                  <div className="font-medium">Preview not available</div>
                  <div className="mt-1 text-sm">
                    STL viewer only supports .stl and .obj files
                  </div>
                  <div className="mt-2 text-xs">
                    Available files:{" "}
                    {files?.map((f) => f.extension.toUpperCase()).join(", ")}
                  </div>
                </>
              ) : (
                <div>No 3D files available</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

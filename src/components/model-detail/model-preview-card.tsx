import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { STLViewerWithSuspense } from "@/components/viewer/stl-viewer";
import { formatBytes } from "@/lib/files/limits";
import { getModelVersions, getModelFiles } from "@/server/functions/models";

type ModelPreviewCardProps = {
  modelId: string;
  versionId?: string;
};

const MAX_IN_BROWSER_PREVIEW_SIZE_BYTES = 40 * 1024 * 1024;

const isTooLargeForInBrowserPreview = (fileSize: number) =>
  fileSize > MAX_IN_BROWSER_PREVIEW_SIZE_BYTES;

export const ModelPreviewCard = ({ modelId, versionId }: ModelPreviewCardProps) => {
  const { data: versions } = useQuery({
    queryKey: ["model", modelId, "versions"],
    queryFn: () => getModelVersions({ data: { modelId } }),
  });
  const activeVersion = versionId ? versions?.find((v) => v.id === versionId) : versions?.[0];

  const { data: files, isLoading } = useQuery({
    queryKey: ["model", modelId, "files", activeVersion?.id],
    queryFn: () => getModelFiles({ data: { modelId, versionId: activeVersion!.id } }),
    enabled: !!activeVersion,
  });

  const previewFiles = useMemo(() => {
    if (!files) return [];
    const viewable = files.filter((file) => ["stl", "obj"].includes(file.extension.toLowerCase()));
    if (viewable.length === 0) return [];
    const sourceViewable = viewable.filter((file) => file.storageKey?.includes("/sources/"));
    return sourceViewable.length > 0 ? sourceViewable : viewable;
  }, [files]);
  const previewFilesWithinSizeLimit = useMemo(
    () => previewFiles.filter((file) => !isTooLargeForInBrowserPreview(file.size)),
    [previewFiles],
  );

  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  useEffect(() => {
    if (previewFiles.length === 0) {
      setActiveFileId(null);
      return;
    }

    if (activeFileId && previewFiles.some((file) => file.id === activeFileId)) {
      return;
    }

    setActiveFileId(previewFilesWithinSizeLimit[0]?.id ?? previewFiles[0]?.id ?? null);
  }, [activeFileId, previewFiles, previewFilesWithinSizeLimit]);

  const activeFile = previewFiles.find((file) => file.id === activeFileId) ?? previewFiles[0];
  const activeFileTooLargeForBrowserPreview = activeFile
    ? isTooLargeForInBrowserPreview(activeFile.size)
    : false;

  // Check if there are any 3D files at all (including unsupported ones)
  const has3DFiles = files?.some((f) =>
    ["stl", "obj", "3mf", "ply"].includes(f.extension.toLowerCase()),
  );

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="border-border/60 border-b">
          <CardTitle className="text-base font-semibold">3D Preview</CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-wide">
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
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="border-border/60 border-b">
          <CardTitle className="text-base font-semibold">3D Preview</CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-wide">
            No version available
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex aspect-video items-center justify-center rounded-b-lg bg-muted/40">
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
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="border-border/60 border-b">
        <CardTitle className="text-base font-semibold">3D Preview</CardTitle>
        <CardDescription className="text-muted-foreground text-xs uppercase tracking-wide">
          Interactive view · {activeVersion.version}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {activeFile?.storageUrl ? (
          <div className="rounded-b-lg bg-muted/20">
            {previewFiles.length > 1 ? (
              <div className="border-border/60 border-b px-4 py-3">
                <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide">
                  <span>Plates</span>
                  <span>{previewFiles.length} total</span>
                </div>
                <div className="mt-2">
                  <Select onValueChange={(value) => setActiveFileId(value)} value={activeFile?.id}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select plate" />
                    </SelectTrigger>
                    <SelectContent>
                      {previewFiles.map((file, index) => {
                        const name = file.originalName || file.filename;
                        const tooLargeForPreview = isTooLargeForInBrowserPreview(file.size);
                        return (
                          <SelectItem key={file.id} value={file.id}>
                            Plate {index + 1} · {name}
                            {tooLargeForPreview ? " · too large for browser preview" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            <div className="aspect-video">
              {activeFileTooLargeForBrowserPreview ? (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <div className="space-y-2 px-6 text-center">
                    <div className="font-medium text-destructive">Preview not available</div>
                    <div className="text-muted-foreground text-sm">
                      This file is {formatBytes(activeFile.size)} and exceeds the in-browser preview
                      limit of {formatBytes(MAX_IN_BROWSER_PREVIEW_SIZE_BYTES)}.
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Download the file to inspect it locally.
                    </div>
                  </div>
                </div>
              ) : (
                <STLViewerWithSuspense
                  className="h-full w-full overflow-hidden rounded-b-lg"
                  filename={activeFile.filename}
                  key={activeFile.id}
                  modelId={modelId}
                  url={activeFile.storageUrl}
                  version={activeVersion.version}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-b-lg bg-muted/40">
            <div className="text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-12 w-12" />
              {has3DFiles ? (
                <>
                  <div className="font-medium">Preview not available</div>
                  <div className="mt-1 text-sm">STL viewer only supports .stl and .obj files</div>
                  <div className="mt-2 text-xs">
                    Available files: {files?.map((f) => f.extension.toUpperCase()).join(", ")}
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

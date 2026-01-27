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
import { getModelVersions, getModelFiles } from "@/server/functions/models";

type ModelPreviewCardProps = {
  modelId: string;
  versionId?: string;
};

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

  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  useEffect(() => {
    if (previewFiles.length === 0) {
      setActiveFileId(null);
      return;
    }

    if (activeFileId && previewFiles.some((file) => file.id === activeFileId)) {
      return;
    }

    setActiveFileId(previewFiles[0]?.id ?? null);
  }, [activeFileId, previewFiles]);

  const activeFile = previewFiles.find((file) => file.id === activeFileId) ?? previewFiles[0];

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
                        return (
                          <SelectItem key={file.id} value={file.id}>
                            Plate {index + 1} · {name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
            <div className="aspect-video">
              <STLViewerWithSuspense
                className="h-full w-full overflow-hidden rounded-b-lg"
                filename={activeFile.filename}
                modelId={modelId}
                url={activeFile.storageUrl}
                version={activeVersion.version}
              />
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

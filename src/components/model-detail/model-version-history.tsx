import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/utils/formatters";
import { getModelVersions, getModel } from "@/server/functions/models";

type ModelVersionHistoryProps = {
  modelId: string;
  activeVersion?: string;
  onVersionSelect: (versionId: string) => void;
};

export const ModelVersionHistory = ({
  modelId,
  activeVersion,
  onVersionSelect,
}: ModelVersionHistoryProps) => {
  const {
    data: versions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["model", modelId, "versions"],
    queryFn: () => getModelVersions({ data: { modelId } }),
  });
  const { data: model } = useQuery({
    queryKey: ["model", modelId],
    queryFn: () => getModel({ data: { id: modelId } }),
  });

  const totalVersions = model?.totalVersions ?? 0;

  return (
    <Card className="shadow-sm transition-all duration-200 hover:shadow-[var(--shadow-brand)]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            {totalVersions} version{totalVersions !== 1 ? "s" : ""}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea aria-label="Version history" className="h-40">
          <div className="space-y-3">
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div className="flex items-start justify-between rounded border p-3" key={i}>
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Failed to load version history
              </div>
            )}

            {!(isLoading || error) && versions?.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No versions available
              </div>
            )}

            {!isLoading &&
              versions &&
              versions.length > 0 &&
              versions.map((version, index) => (
                <div
                  className={`flex items-start justify-between rounded border p-3 ${
                    version.id === activeVersion ? "border-l-4 border-l-brand" : ""
                  }`}
                  key={version.id}
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={version.id === activeVersion ? "default" : "outline"}>
                        {version.version}
                      </Badge>
                      {version.id === activeVersion && (
                        <Badge className="bg-brand text-brand-foreground text-xs">Active</Badge>
                      )}
                      {index === 0 && version.id !== activeVersion && (
                        <Badge className="text-xs" variant="outline">
                          Latest
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {formatDate(new Date(version.createdAt))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className={version.id !== activeVersion ? "hover:text-brand" : ""}
                      onClick={() => onVersionSelect(version.id)}
                      size="sm"
                      variant={version.id === activeVersion ? "secondary" : "outline"}
                    >
                      {version.id === activeVersion ? "Viewing" : "View"}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

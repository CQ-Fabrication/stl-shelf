import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/utils/formatters";
import { getModel, getModelVersions } from "@/server/functions/models";

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
  const [showAll, setShowAll] = useState(false);
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

  const versionsList = versions ?? [];
  const totalVersions = model?.totalVersions ?? versionsList.length;
  const visibleVersions = showAll ? versionsList : versionsList.slice(0, 5);
  const hasMore = versionsList.length > 5;

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="border-border/60 border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <History className="h-5 w-5 text-muted-foreground" />
              Version History
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs uppercase tracking-wide">
              {totalVersions} version{totalVersions !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          {hasMore && (
            <Button onClick={() => setShowAll((prev) => !prev)} size="sm" variant="outline">
              {showAll ? "Collapse" : `Show all (${versionsList.length})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                className="flex items-start justify-between rounded-lg border border-border/60 bg-muted/20 p-3"
                key={i}
              >
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
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-center text-muted-foreground text-sm">
            Failed to load version history
          </div>
        )}

        {!isLoading && !error && versionsList.length === 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-center text-muted-foreground text-sm">
            No versions available
          </div>
        )}

        {!isLoading && !error && versionsList.length > 0 && (
          <div className="space-y-3">
            {visibleVersions.map((version, index) => (
              <div
                className={`rounded-lg border border-border/60 p-3 ${
                  version.id === activeVersion ? "bg-muted/30" : "bg-muted/10"
                }`}
                key={version.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
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
                    <div className="text-muted-foreground text-xs">
                      {formatDate(new Date(version.createdAt))} · {version.files.length} file
                      {version.files.length !== 1 ? "s" : ""}
                    </div>
                    {version.description ? (
                      <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                        {version.description}
                      </p>
                    ) : (
                      <p className="mt-2 text-muted-foreground text-sm italic">
                        No changelog provided
                      </p>
                    )}
                  </div>
                  <div className="flex items-start">
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

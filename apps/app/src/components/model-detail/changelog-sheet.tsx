import { Badge } from "@stl-shelf/ui/components/badge";
import { ScrollArea } from "@stl-shelf/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@stl-shelf/ui/components/sheet";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { formatDate } from "@/utils/formatters";
import { orpc } from "@/utils/orpc";

type ChangelogSheetProps = {
  modelId: string;
  activeVersionId?: string;
  isOpen: boolean;
  onClose: () => void;
};

export function ChangelogSheet({
  modelId,
  activeVersionId,
  isOpen,
  onClose,
}: ChangelogSheetProps) {
  const { data: versions } = useQuery(
    orpc.models.getModelVersions.queryOptions({ input: { modelId } })
  );

  return (
    <Sheet onOpenChange={(open: boolean) => !open && onClose()} open={isOpen}>
      <SheetContent className="flex flex-col sm:max-w-md" side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </SheetTitle>
          <SheetDescription>
            {versions?.length ?? 0} version
            {(versions?.length ?? 0) !== 1 ? "s" : ""} · Full changelog
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="-mx-6 mt-6 flex-1 px-6">
          <div className="space-y-3 pb-6">
            {versions?.length ? (
              versions.map((version, index) => {
                const isCurrent = version.id === activeVersionId;
                const isLatest = index === 0;

                return (
                  <div
                    className={`rounded border p-3 ${
                      isCurrent ? "border-l-4 border-l-brand" : ""
                    }`}
                    key={version.id}
                  >
                    {/* Header: Badge row - same as card */}
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={isCurrent ? "default" : "outline"}>
                        {version.version}
                      </Badge>
                      {isCurrent && (
                        <Badge className="bg-brand text-brand-foreground text-xs">
                          Active
                        </Badge>
                      )}
                      {isLatest && !isCurrent && (
                        <Badge className="text-xs" variant="outline">
                          Latest
                        </Badge>
                      )}
                    </div>

                    {/* Date - same as card */}
                    <div className="text-muted-foreground text-sm">
                      {formatDate(new Date(version.createdAt))}
                    </div>

                    {/* Description - ADDED */}
                    {version.description ? (
                      <p className="mt-2 text-foreground/80 text-sm leading-relaxed">
                        {version.description}
                      </p>
                    ) : (
                      <p className="mt-2 text-muted-foreground/60 text-sm italic">
                        No changelog provided
                      </p>
                    )}

                    {/* File count */}
                    <div className="mt-2 text-muted-foreground text-xs">
                      {version.files.length} file
                      {version.files.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No versions available
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

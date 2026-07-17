import { Loader2, Plus, Search, Tags } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useOrgTags, type OrgTag } from "@/hooks/use-org-tags";
import { TagCreateDialog } from "./tag-create-dialog";
import { TagRow } from "./tag-row";

// usageCount desc, then name asc — the taxonomy's "biggest first", with a
// stable alphabetical tiebreak so equal-usage tags don't reshuffle.
function sortTags(tags: OrgTag[]): OrgTag[] {
  return [...tags].sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name));
}

export function TagManager() {
  const { data: tags, isLoading, isError } = useOrgTags();
  const [search, setSearch] = useState("");
  const [orphansOnly, setOrphansOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const allTags = useMemo(() => sortTags(tags ?? []), [tags]);

  const visibleTags = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allTags.filter((tag) => {
      if (orphansOnly && tag.usageCount > 0) return false;
      if (query && !tag.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [allTags, search, orphansOnly]);

  const orphanCount = useMemo(
    () => allTags.filter((tag) => tag.usageCount === 0).length,
    [allTags],
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          Failed to load tags. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags</CardTitle>
        <CardDescription>
          Rename, merge, recolor, or delete tags across your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allTags.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Tags className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium text-sm">No tags yet</p>
            <p className="text-muted-foreground text-sm">
              Create one here, or add tags to models and they'll show up for management.
            </p>
            <Button className="mt-1" onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New tag
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tags…"
                  value={search}
                />
              </div>
              <Button className="shrink-0" onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New tag
              </Button>
              <Button
                className="shrink-0"
                disabled={orphanCount === 0}
                onClick={() => setOrphansOnly((prev) => !prev)}
                size="sm"
                variant={orphansOnly ? "default" : "outline"}
              >
                Orphans only{orphanCount > 0 ? ` (${orphanCount})` : ""}
              </Button>
            </div>

            {visibleTags.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">
                No tags match your filters.
              </p>
            ) : (
              <div className="space-y-2">
                {visibleTags.map((tag) => (
                  <TagRow allTags={allTags} key={tag.id} tag={tag} />
                ))}
              </div>
            )}
          </>
        )}

        <TagCreateDialog onOpenChange={setCreateOpen} open={createOpen} />
      </CardContent>
    </Card>
  );
}

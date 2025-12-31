import { Search, Tag, X } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useAllTags } from "@/hooks/use-all-tags";
import { Badge } from "@stl-shelf/ui/components/badge";
import { Button } from "@stl-shelf/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@stl-shelf/ui/components/dropdown-menu";
import { Input } from "@stl-shelf/ui/components/input";

function ModelSearch() {
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ throttleMs: 300 })
  );
  const [tags, setTags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString, ",").withDefault([])
  );

  const { tags: allTags } = useAllTags();

  const handleTagToggle = (tag: string) => {
    const newTags = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    setTags(newTags);
  };

  const handleTagRemove = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
  };

  const clearFilters = () => {
    setSearch("");
    setTags([]);
  };

  const hasFilters = search || tags.length > 0;

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
        <Input
          className="pr-10 pl-10"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models..."
          value={search}
        />
        {search && (
          <Button
            className="-translate-y-1/2 absolute top-1/2 right-1 h-8 w-8 transform p-0"
            onClick={() => setSearch("")}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Tag filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Tag className="mr-2 h-4 w-4" />
              Tags
              {tags.length > 0 && (
                <Badge className="ml-2 h-5 px-1 text-xs" variant="secondary">
                  {tags.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {allTags.length === 0 ? (
              <div className="p-2 text-muted-foreground text-sm">
                No tags available
              </div>
            ) : (
              allTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  checked={tags.includes(tag.name)}
                  key={tag.name}
                  onCheckedChange={() => handleTagToggle(tag.name)}
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Selected tags */}
        {tags.map((tag) => (
          <Badge className="gap-1" key={tag} variant="secondary">
            {tag}
            <Button
              className="h-auto w-auto p-0 hover:bg-transparent"
              onClick={() => handleTagRemove(tag)}
              size="sm"
              variant="ghost"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}

        {/* Clear all filters */}
        {hasFilters && (
          <Button
            className="text-muted-foreground hover:text-foreground"
            onClick={clearFilters}
            size="sm"
            variant="ghost"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}

ModelSearch.displayName = "ModelSearch";

export { ModelSearch };
export default ModelSearch;

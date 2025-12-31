import { Check, ChevronDown, Search, Tag, Trash2, X } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useAllTags } from "@/hooks/use-all-tags";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

type SearchFilterBarProps = {
  className?: string;
};

export function SearchFilterBar({ className }: SearchFilterBarProps) {
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ throttleMs: 300 })
  );
  const [selectedTags, setSelectedTags] = useQueryState(
    "tags",
    parseAsArrayOf(parseAsString, ",").withDefault([])
  );

  const { tags: allTags } = useAllTags();

  const handleTagToggle = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    setSelectedTags(newTags);
  };

  const handleTagRemove = (tagName: string) => {
    const newTags = selectedTags.filter((t) => t !== tagName);
    setSelectedTags(newTags);
  };

  const clearSelectedTags = () => {
    setSelectedTags([]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Unified Search and Filter Bar */}
      <div className="flex">
        <div className="flex flex-1 items-center rounded-lg border bg-background shadow-sm focus-within:ring-2 focus-within:ring-brand/20">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
            <Input
              className="border-0 bg-transparent pr-10 pl-10 shadow-none focus-visible:ring-0"
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

          <Separator className="h-8" orientation="vertical" />

          {/* Tags Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                className={cn(
                  "h-10 min-w-[100px] gap-2 rounded-none border-0 px-3 shadow-none hover:bg-accent/50",
                  selectedTags.length > 0 && "text-brand"
                )}
                variant="ghost"
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Tags{selectedTags.length > 0 && ` (${selectedTags.length})`}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Search tags..." />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {selectedTags.length > 0 && (
                      <>
                        <CommandItem
                          className="text-destructive focus:text-destructive"
                          onSelect={clearSelectedTags}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear selected tags
                        </CommandItem>
                        <Separator className="my-1" />
                      </>
                    )}
                    {allTags.map((tag) => (
                      <CommandItem
                        key={tag.name}
                        onSelect={() => handleTagToggle(tag.name)}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedTags.includes(tag.name)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                        <span>{tag.name}</span>
                        {tag.usageCount > 0 && (
                          <span className="ml-auto text-muted-foreground text-xs">
                            {tag.usageCount}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters Display - Always reserve space */}
      <div className="flex min-h-[32px] flex-wrap gap-2">
        {selectedTags.length > 0 &&
          selectedTags.map((tag) => (
            <Badge
              className="gap-1 border-brand/20 bg-brand/10 text-brand-foreground hover:bg-brand/15"
              key={tag}
            >
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
      </div>
    </div>
  );
}

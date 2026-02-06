import { Check, ChevronDown, Loader2, Search, Tag, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Route } from "@/routes/library";
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

export type SearchDraft = {
  q: string;
  tags: string[];
};

type CommitMode = "debounced" | "immediate";
export const SEARCH_DEBOUNCE_MS = 300;

// Parse tags string to array
const parseTags = (tagsString?: string): string[] => {
  if (!tagsString) return [];
  return tagsString.split(",").filter(Boolean);
};

export const buildDraft = (q?: string, tagsString?: string): SearchDraft => ({
  q: q ?? "",
  tags: parseTags(tagsString),
});

export const buildSearch = (draft: SearchDraft) => ({
  q: draft.q || undefined,
  tags: draft.tags.length > 0 ? draft.tags.join(",") : undefined,
});

export const isSameDraft = (a: SearchDraft, b: SearchDraft): boolean =>
  a.q === b.q &&
  a.tags.length === b.tags.length &&
  a.tags.every((tag, index) => tag === b.tags[index]);

export const setDraftQuery = (draft: SearchDraft, q: string): SearchDraft => ({
  ...draft,
  q,
});

export const toggleDraftTag = (draft: SearchDraft, tagName: string): SearchDraft => ({
  ...draft,
  tags: draft.tags.includes(tagName)
    ? draft.tags.filter((tag) => tag !== tagName)
    : [...draft.tags, tagName],
});

export const removeDraftTag = (draft: SearchDraft, tagName: string): SearchDraft => ({
  ...draft,
  tags: draft.tags.filter((tag) => tag !== tagName),
});

export const clearDraftTags = (draft: SearchDraft): SearchDraft => ({
  ...draft,
  tags: [],
});

export function createDebouncedDraftCommit(
  commit: (draft: SearchDraft, replace: boolean) => void,
  delayMs = SEARCH_DEBOUNCE_MS,
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(draft: SearchDraft) {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        timeout = null;
        commit(draft, true);
      }, delayMs);
    },
    flush(draft: SearchDraft) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      commit(draft, false);
    },
    cancel() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    },
    hasPending() {
      return timeout !== null;
    },
  };
}

export function SearchFilterBar({ className }: SearchFilterBarProps) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // Local draft is the single source of truth for UI state
  const [draft, setDraft] = useState<SearchDraft>(() => buildDraft(search.q, search.tags));
  const [isPending, setIsPending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const isSyncingLocalRef = useRef(false);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Sync URL -> local draft only when there are no local commits pending
  useEffect(() => {
    const nextDraft = buildDraft(search.q, search.tags);

    if (timeoutRef.current || isSyncingLocalRef.current) {
      if (isSameDraft(draftRef.current, nextDraft)) {
        isSyncingLocalRef.current = false;
      }
      return;
    }

    if (!isSameDraft(draftRef.current, nextDraft)) {
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }
  }, [search.q, search.tags]);

  const { tags: allTags } = useAllTags();
  const selectedTags = draft.tags;
  const localSearch = draft.q;

  const commitDraft = useCallback(
    (nextDraft: SearchDraft, mode: CommitMode) => {
      const runNavigate = (replace: boolean) => {
        isSyncingLocalRef.current = true;
        void navigate({
          search: buildSearch(nextDraft),
          replace,
        });
      };

      if (mode === "debounced") {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        setIsPending(true);

        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          setIsPending(false);
          runNavigate(true);
        }, SEARCH_DEBOUNCE_MS);
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsPending(false);
      runNavigate(false);
    },
    [navigate],
  );

  const updateDraft = useCallback(
    (updater: (current: SearchDraft) => SearchDraft, mode: CommitMode) => {
      const nextDraft = updater(draftRef.current);
      if (isSameDraft(draftRef.current, nextDraft)) {
        return;
      }
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      commitDraft(nextDraft, mode);
    },
    [commitDraft],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = (value: string) => {
    updateDraft((current) => setDraftQuery(current, value), "debounced");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft(draftRef.current, "immediate");
    }
  };

  const handleTagToggle = (tagName: string) => {
    updateDraft((current) => toggleDraftTag(current, tagName), "immediate");
  };

  const handleTagRemove = (tagName: string) => {
    updateDraft((current) => removeDraftTag(current, tagName), "immediate");
  };

  const clearSelectedTags = () => {
    updateDraft((current) => clearDraftTags(current), "immediate");
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
              className={cn(
                "border-0 bg-transparent pr-10 pl-10 shadow-none transition-opacity focus-visible:ring-0",
                isPending && "opacity-70",
              )}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search models..."
              value={localSearch}
            />
            {isPending && (
              <Loader2 className="-translate-y-1/2 absolute top-1/2 right-10 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {localSearch && !isPending && (
              <Button
                className="-translate-y-1/2 absolute top-1/2 right-1 h-8 w-8 transform p-0"
                onClick={() => handleSearchChange("")}
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
                  selectedTags.length > 0 && "text-brand",
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
                    {allTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.name);
                      return (
                        <CommandItem
                          disabled={isSelected}
                          key={tag.name}
                          onSelect={() => handleTagToggle(tag.name)}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible",
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
                      );
                    })}
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
          selectedTags.map((tag) => {
            const removeLabel = "Remove " + tag + " filter";
            return (
              <Badge
                className="gap-1.5 border-brand bg-brand px-2.5 py-1 font-medium text-brand-foreground transition-colors hover:bg-brand/90"
                key={tag}
                variant="default"
              >
                {tag}
                <Button
                  aria-label={removeLabel}
                  className="-mr-1 h-4 w-4 rounded-full p-0 text-brand-foreground/70 hover:bg-brand-foreground/20 hover:text-brand-foreground"
                  onClick={() => handleTagRemove(tag)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
      </div>
    </div>
  );
}

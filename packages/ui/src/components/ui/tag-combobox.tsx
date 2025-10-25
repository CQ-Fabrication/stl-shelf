import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@stl-shelf/ui/components/badge";
import { Button } from "@stl-shelf/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@stl-shelf/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@stl-shelf/ui/components/popover";
import { TextHighlight } from "@stl-shelf/ui/components/text-highlight";
import { cn } from "@stl-shelf/ui/lib/utils";

type TagInfo = {
  name: string;
  color: string | null;
  usageCount: number;
};

type TagComboboxProps = {
  availableTags: TagInfo[] | string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  allowCreate?: boolean;
  disabled?: boolean;
  className?: string;
};

export function TagCombobox({
  availableTags,
  selectedTags,
  onTagsChange,
  placeholder = "Select tags...",
  allowCreate = true,
  disabled = false,
  className,
}: TagComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Normalize tags to handle both string[] and TagInfo[] formats
  const normalizedTags = useMemo(() => {
    if (!availableTags.length) return [];

    // Check if it's TagInfo[] or string[]
    const firstTag = availableTags[0];
    if (typeof firstTag === "string") {
      // Convert string[] to TagInfo[] format
      return (availableTags as string[]).map((tag) => ({
        name: tag,
        color: null,
        usageCount: 0,
      }));
    }
    return availableTags as TagInfo[];
  }, [availableTags]);

  // Create a map of tag names to colors for selected tags
  const tagColorMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const tag of normalizedTags) {
      map.set(tag.name.toLowerCase(), tag.color);
    }
    return map;
  }, [normalizedTags]);

  const handleSelect = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim();
    if (!normalizedTag) return;

    if (selectedTags.includes(normalizedTag)) {
      onTagsChange(selectedTags.filter((t) => t !== normalizedTag));
    } else {
      onTagsChange([...selectedTags, normalizedTag]);
    }
    setInputValue("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleCreateTag = () => {
    const newTag = inputValue.toLowerCase().trim();
    if (newTag && !selectedTags.includes(newTag)) {
      onTagsChange([...selectedTags, newTag]);
      setInputValue("");
      setOpen(false);
    }
  };

  // Filter available tags based on input
  const filteredTags = normalizedTags.filter((tag) =>
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if input value is an exact match or already selected
  const exactMatch = normalizedTags.some(
    (tag) => tag.name.toLowerCase() === inputValue.toLowerCase()
  );
  const isAlreadySelected = selectedTags.includes(inputValue.toLowerCase());
  const shouldShowCreate =
    allowCreate && inputValue.trim() && !exactMatch && !isAlreadySelected;

  return (
    <div className={cn("space-y-2", className)}>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
            role="combobox"
            variant="outline"
          >
            <span className="text-muted-foreground">
              {selectedTags.length > 0
                ? `${selectedTags.length} tag${
                    selectedTags.length > 1 ? "s" : ""
                  } selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-full p-0">
          <Command shouldFilter={false}>
            <CommandInput
              onValueChange={setInputValue}
              placeholder="Search or create tags..."
              value={inputValue}
            />
            <CommandList>
              <CommandEmpty>
                {inputValue.trim() ? (
                  <div className="py-2 text-muted-foreground text-sm">
                    No tags found.
                  </div>
                ) : (
                  <div className="py-2 text-muted-foreground text-sm">
                    Start typing to search or create tags.
                  </div>
                )}
              </CommandEmpty>

              {shouldShowCreate && (
                <CommandGroup>
                  <CommandItem
                    className="font-medium"
                    onSelect={handleCreateTag}
                    value={inputValue}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>
                      Create{" "}
                      <TextHighlight
                        highlight={inputValue}
                        text={`"${inputValue}"`}
                      />
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}

              {filteredTags.length > 0 && (
                <CommandGroup heading="Available tags">
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.name}
                      onSelect={() => handleSelect(tag.name)}
                      value={tag.name}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedTags.includes(tag.name.toLowerCase())
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span>
                        <TextHighlight highlight={inputValue} text={tag.name} />
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => {
            const tagColor = tagColorMap.get(tag);
            return (
              <Badge
                className="gap-1"
                key={tag}
                style={
                  tagColor
                    ? {
                        backgroundColor: tagColor,
                        borderColor: tagColor,
                        color: "white",
                      }
                    : undefined
                }
                variant={tagColor ? "outline" : "secondary"}
              >
                {tag}
                <Button
                  className="h-auto w-auto p-0 hover:bg-transparent"
                  disabled={disabled}
                  onClick={() => handleRemoveTag(tag)}
                  size="sm"
                  style={tagColor ? { color: "white" } : undefined}
                  variant="ghost"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

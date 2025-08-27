import { useQuery } from '@tanstack/react-query';
import { Search, Tag, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { orpc } from '@/utils/orpc';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Input } from '../ui/input';

type ModelSearchProps = {
  defaultSearch?: string;
  defaultTags?: string[];
  onSearchChange?: (search: string, tags: string[]) => void;
};

export function ModelSearch({
  defaultSearch = '',
  defaultTags = [],
  onSearchChange,
}: ModelSearchProps) {
  const [searchInput, setSearchInput] = useState(defaultSearch);
  const [selectedTags, setSelectedTags] = useState<string[]>(defaultTags);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(defaultSearch);

  useEffect(() => {
    const DEBOUNCE_DELAY = 300;
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Notify parent of changes
  useEffect(() => {
    onSearchChange?.(debouncedSearch, selectedTags);
  }, [debouncedSearch, selectedTags, onSearchChange]);

  // Fetch available tags
  const { data: allTags = [] } = useQuery(orpc.getAllTags.queryOptions({}));

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
  };

  const handleClearTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleClearAll = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedTags([]);
  };

  const hasFilters = debouncedSearch || selectedTags.length > 0;

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
        <Input
          className="pr-10 pl-10"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search models..."
          value={searchInput}
        />
        {searchInput && (
          <Button
            className="-translate-y-1/2 absolute top-1/2 right-1 h-8 w-8 transform p-0"
            onClick={handleClearSearch}
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
              {selectedTags.length > 0 && (
                <Badge className="ml-2 h-5 px-1 text-xs" variant="secondary">
                  {selectedTags.length}
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
                  checked={selectedTags.includes(tag)}
                  key={tag}
                  onCheckedChange={() => handleTagToggle(tag)}
                >
                  {tag}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Selected tags */}
        {selectedTags.map((tag) => (
          <Badge className="gap-1" key={tag} variant="secondary">
            {tag}
            <Button
              className="h-auto w-auto p-0 hover:bg-transparent"
              onClick={() => handleClearTag(tag)}
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
            onClick={handleClearAll}
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

import { Loader2, Search, Tag, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Route } from '@/routes/library'
import { useAllTags } from '@/hooks/use-all-tags'
import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

// Parse tags string to array
const parseTags = (tagsString?: string): string[] => {
  if (!tagsString) return []
  return tagsString.split(',').filter(Boolean)
}

function ModelSearch() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  // Local state for instant input feedback
  const [localSearch, setLocalSearch] = useState(search.q ?? '')
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync URL -> local state (for direct URL access, back/forward navigation)
  useEffect(() => {
    setLocalSearch(search.q ?? '')
  }, [search.q])

  const { tags: allTags } = useAllTags()
  const selectedTags = parseTags(search.tags)

  // Debounced navigation for search input
  const debouncedNavigate = useCallback(
    (value: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsPending(true)

      timeoutRef.current = setTimeout(() => {
        setIsPending(false)
        navigate({
          search: {
            q: value || undefined,
            tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
          },
        })
      }, 300)
    },
    [navigate, selectedTags]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    debouncedNavigate(value)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Immediate commit on Enter
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsPending(false)
      navigate({
        search: {
          q: localSearch || undefined,
          tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        },
      })
    }
  }

  const handleTagToggle = (tag: string) => {
    // Tags update immediately (no debounce) - discrete selection
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag]

    navigate({
      search: {
        q: search.q || undefined,
        tags: newTags.length > 0 ? newTags.join(',') : undefined,
      },
    })
  }

  const handleTagRemove = (tag: string) => {
    const newTags = selectedTags.filter((t) => t !== tag)
    navigate({
      search: {
        q: search.q || undefined,
        tags: newTags.length > 0 ? newTags.join(',') : undefined,
      },
    })
  }

  const clearFilters = () => {
    setLocalSearch('')
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsPending(false)
    navigate({
      search: {},
    })
  }

  const hasFilters = localSearch || selectedTags.length > 0

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
        <Input
          className={`pr-10 pl-10 transition-opacity ${isPending ? 'opacity-70' : ''}`}
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
            onClick={() => handleSearchChange('')}
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
              allTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name)
                return (
                  <DropdownMenuCheckboxItem
                    checked={isSelected}
                    disabled={isSelected}
                    key={tag.name}
                    onCheckedChange={() => handleTagToggle(tag.name)}
                  >
                    {tag.name}
                  </DropdownMenuCheckboxItem>
                )
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Selected tags */}
        {selectedTags.map((tag) => (
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
  )
}

ModelSearch.displayName = 'ModelSearch'

export { ModelSearch }
export default ModelSearch

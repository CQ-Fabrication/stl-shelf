import { Check, Pencil, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { Button } from '@/components/ui/button'
import { useRenameModel } from '@/hooks/use-rename-model'
import { cn } from '@/lib/utils'

// Characters that are dangerous for filesystems - block during input
const INVALID_CHARS_REGEX = /[<>:"/\\|?*]/

type InlineNameEditorProps = {
  modelId: string
  name: string
  onEditStart: () => void
  onEditEnd: () => void
}

export function InlineNameEditor({
  modelId,
  name,
  onEditStart,
  onEditEnd,
}: InlineNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(name)
  const [error, setError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const nameButtonRef = useRef<HTMLButtonElement>(null)

  const renameModel = useRenameModel(modelId)

  // Sync editValue with name prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditValue(name)
    }
  }, [name, isEditing])

  const announce = useCallback((message: string) => {
    setAnnouncement(message)
    // Clear after announcement is read
    setTimeout(() => setAnnouncement(''), 1000)
  }, [])

  const enterEditMode = useCallback(() => {
    setIsEditing(true)
    setEditValue(name)
    setError(null)
    onEditStart()
    announce('Editing model name')

    // Focus and select text after render
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    })
  }, [name, onEditStart, announce])

  const exitEditMode = useCallback(
    (restoreFocus = true) => {
      setIsEditing(false)
      setError(null)
      onEditEnd()

      if (restoreFocus) {
        requestAnimationFrame(() => {
          nameButtonRef.current?.focus()
        })
      }
    },
    [onEditEnd]
  )

  const handleSave = useCallback(() => {
    const trimmedValue = editValue.trim()

    // Validation
    if (trimmedValue.length === 0) {
      setError('Name is required')
      return
    }

    if (trimmedValue.length > 100) {
      setError('Name must be 100 characters or less')
      return
    }

    // Don't save if unchanged
    if (trimmedValue === name) {
      exitEditMode()
      return
    }

    // Optimistic exit - mutation handles the rest
    exitEditMode(false)
    announce(`Model renamed to ${trimmedValue}`)

    renameModel.mutate(
      { id: modelId, name: trimmedValue },
      {
        onSettled: () => {
          // Restore focus after mutation completes
          requestAnimationFrame(() => {
            nameButtonRef.current?.focus()
          })
        },
      }
    )
  }, [editValue, name, modelId, renameModel, exitEditMode, announce])

  const handleCancel = useCallback(() => {
    setEditValue(name)
    exitEditMode()
  }, [name, exitEditMode])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    },
    [handleSave, handleCancel]
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value

      // Block invalid characters (filter them out silently)
      if (INVALID_CHARS_REGEX.test(value)) {
        // Remove invalid characters from the new value
        const sanitized = value.replace(new RegExp(INVALID_CHARS_REGEX, 'g'), '')
        setEditValue(sanitized)
        return
      }

      setEditValue(value)
      setError(null)
    },
    []
  )

  // Handle beforeInput to block invalid keystrokes entirely
  const handleBeforeInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const inputEvent = e.nativeEvent as InputEvent
      if (inputEvent.data && INVALID_CHARS_REGEX.test(inputEvent.data)) {
        e.preventDefault()
      }
    },
    []
  )

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const transitionClass = prefersReducedMotion
    ? ''
    : 'transition-all duration-150 ease-out'

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            'flex items-center gap-2',
            transitionClass,
            !prefersReducedMotion && 'animate-in fade-in-0 zoom-in-95'
          )}
        >
          <input
            ref={inputRef}
            aria-describedby={error ? 'name-error' : undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-label="Model name"
            className={cn(
              // Match h1 typography exactly
              'font-bold text-4xl tracking-tight',
              // Seamless styling - transparent background, minimal border
              'bg-transparent',
              'border-0 border-b-2 border-transparent',
              'focus:border-b-brand focus:outline-none',
              'placeholder:text-muted-foreground/50',
              // Size and spacing
              'w-full min-w-0 py-0.5',
              // Error state
              error && 'border-b-destructive focus:border-b-destructive'
            )}
            maxLength={100}
            onBeforeInput={handleBeforeInput}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            type="text"
            value={editValue}
          />
          <div className="flex shrink-0 items-center gap-1">
            <Button
              aria-label="Save name"
              disabled={renameModel.isPending}
              onClick={handleSave}
              size="icon"
              variant="default"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Cancel editing"
              disabled={renameModel.isPending}
              onClick={handleCancel}
              size="icon"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {error && (
          <p
            className="text-destructive text-sm animate-in fade-in-0 slide-in-from-top-1"
            id="name-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {/* Screen reader announcement region */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2">
      <button
        ref={nameButtonRef}
        className={cn(
          // Match h1 typography
          'font-bold text-4xl tracking-tight',
          // Truncation for long names
          'max-w-full truncate',
          // Interactive styling
          'cursor-pointer text-left',
          'rounded-sm',
          'hover:text-brand',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          // Transition
          transitionClass
        )}
        onClick={enterEditMode}
        type="button"
      >
        {name}
      </button>
      <button
        aria-label="Edit model name"
        className={cn(
          // 48px touch target with invisible expansion
          'relative flex h-8 w-8 items-center justify-center',
          'before:absolute before:inset-0 before:-m-2 before:content-[""]',
          // Styling
          'rounded-md',
          'text-muted-foreground',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
          // Transition
          transitionClass
        )}
        onClick={enterEditMode}
        type="button"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {/* Screen reader announcement region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  )
}

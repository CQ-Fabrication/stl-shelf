import { cva, type VariantProps } from "class-variance-authority";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Gradient configurations for avatar fallbacks.
 * Each gradient is designed to work well in both light and dark modes.
 */
const GRADIENT_CONFIGS = [
  {
    from: "from-rose-400",
    to: "to-orange-300",
    darkFrom: "dark:from-rose-500",
    darkTo: "dark:to-orange-400",
  },
  {
    from: "from-violet-400",
    to: "to-purple-300",
    darkFrom: "dark:from-violet-500",
    darkTo: "dark:to-purple-400",
  },
  {
    from: "from-blue-400",
    to: "to-cyan-300",
    darkFrom: "dark:from-blue-500",
    darkTo: "dark:to-cyan-400",
  },
  {
    from: "from-emerald-400",
    to: "to-teal-300",
    darkFrom: "dark:from-emerald-500",
    darkTo: "dark:to-teal-400",
  },
  {
    from: "from-amber-400",
    to: "to-yellow-300",
    darkFrom: "dark:from-amber-500",
    darkTo: "dark:to-yellow-400",
  },
  {
    from: "from-pink-400",
    to: "to-rose-300",
    darkFrom: "dark:from-pink-500",
    darkTo: "dark:to-rose-400",
  },
  {
    from: "from-indigo-400",
    to: "to-blue-300",
    darkFrom: "dark:from-indigo-500",
    darkTo: "dark:to-blue-400",
  },
  {
    from: "from-teal-400",
    to: "to-emerald-300",
    darkFrom: "dark:from-teal-500",
    darkTo: "dark:to-emerald-400",
  },
] as const;

/**
 * Simple hash function to convert string to consistent number.
 * Uses djb2 algorithm for good distribution.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Get deterministic gradient classes based on id.
 */
function getGradientClasses(id: string): string {
  const index = hashString(id) % GRADIENT_CONFIGS.length;
  const config = GRADIENT_CONFIGS[index] ?? GRADIENT_CONFIGS[0];
  return `bg-gradient-to-br ${config.from} ${config.to} ${config.darkFrom} ${config.darkTo}`;
}

/**
 * Extract initials from name (first letter of first word).
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-white select-none",
  {
    variants: {
      size: {
        xs: "size-5 text-[10px]",
        sm: "size-8 text-xs",
        md: "size-12 text-base",
        lg: "size-20 text-2xl",
        xl: "size-[120px] text-4xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type GradientAvatarProps = {
  /** Image source URL */
  src?: string | null;
  /** Name used for generating initials fallback */
  name: string;
  /** Unique identifier used for deterministic gradient color */
  id: string;
  /** Additional CSS classes */
  className?: string;
  /** Alt text for the image (defaults to name) */
  alt?: string;
} & VariantProps<typeof avatarVariants>;

/**
 * GradientAvatar component displays a user or organization avatar.
 * Falls back to a gradient background with initials if no image is provided or if image fails to load.
 * The gradient color is deterministic based on the id prop.
 */
export function GradientAvatar({ src, name, id, size, className, alt }: GradientAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const showImage = src && !imageError;
  const gradientClasses = getGradientClasses(id);

  return (
    <span
      className={cn(avatarVariants({ size }), gradientClasses, className)}
      data-slot="gradient-avatar"
    >
      {/* Gradient background with initial - always rendered for smooth fallback */}
      <span
        aria-hidden={showImage && imageLoaded ? true : undefined}
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
          showImage && imageLoaded ? "opacity-0" : "opacity-100",
        )}
      >
        {getInitials(name)}
      </span>

      {/* Image - rendered on top when available */}
      {showImage && (
        <img
          alt={alt ?? name}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
            imageLoaded ? "opacity-100" : "opacity-0",
          )}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
          src={src}
        />
      )}
    </span>
  );
}

/**
 * Get gradient classes for use outside the component (e.g., for organization logos in header).
 * Re-exported for consistency.
 */
export { getGradientClasses, getInitials };

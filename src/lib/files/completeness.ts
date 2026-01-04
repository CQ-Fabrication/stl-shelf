/**
 * Version completeness utilities
 *
 * A complete version has:
 * - Model file(s) - the 3D geometry (STL, OBJ, PLY)
 * - Slicer file - container with print settings (3MF)
 * - Image file - preview image
 *
 * Category limits:
 * - Model: Unlimited (multi-part prints allowed)
 * - Slicer: 1 per version (one 3MF with settings)
 * - Image: 1 per version (future: 5-10 for PrintPulse/Storefront)
 */

/**
 * Completeness categories (different from FILE_CATEGORIES in limits.ts)
 * These represent the three pillars of a "complete" model version
 */
export type CompletenessCategory = "model" | "slicer" | "image";

/**
 * Extension to category mapping for completeness tracking
 */
const COMPLETENESS_EXTENSIONS = {
  model: ["stl", "obj", "ply"] as const,
  slicer: ["3mf"] as const,
  image: ["jpg", "jpeg", "png", "webp", "gif"] as const,
} as const;

/**
 * Category limits - designed for future extensibility
 * Image limit will increase to 5-10 when integrating with PrintPulse/Storefront
 */
const DEFAULT_CATEGORY_LIMITS: Record<CompletenessCategory, number> = {
  model: Infinity,
  slicer: 1,
  image: 1,
};

/**
 * Get the limit for a category
 * Abstracted for future extensibility (user tiers, preferences, etc.)
 */
export function getCategoryLimit(category: CompletenessCategory): number {
  return DEFAULT_CATEGORY_LIMITS[category];
}

/**
 * Completeness status for a version
 */
export type CompletenessStatus = {
  hasModel: boolean;
  hasSlicer: boolean;
  hasImage: boolean;
  isComplete: boolean;
  missingCategories: CompletenessCategory[];
  counts: Record<CompletenessCategory, number>;
};

/**
 * Minimal file info needed for completeness calculation
 */
export type FileForCompleteness = {
  extension: string;
  createdAt: Date | string;
};

/**
 * Get the completeness category for an extension
 */
export function getCategoryFromExtension(extension: string): CompletenessCategory | null {
  const ext = extension.toLowerCase().replace(".", "");

  for (const [category, extensions] of Object.entries(COMPLETENESS_EXTENSIONS)) {
    if ((extensions as readonly string[]).includes(ext)) {
      return category as CompletenessCategory;
    }
  }

  return null;
}

/**
 * Options for completeness calculation
 */
export type CompletenessOptions = {
  /** Whether the version has a thumbnail stored separately from files */
  hasThumbnail?: boolean;
};

/**
 * Calculate completeness status from a list of files
 */
export function getCompletenessStatus(
  files: FileForCompleteness[],
  options?: CompletenessOptions,
): CompletenessStatus {
  const counts: Record<CompletenessCategory, number> = {
    model: 0,
    slicer: 0,
    image: 0,
  };

  for (const file of files) {
    const category = getCategoryFromExtension(file.extension);
    if (category) {
      counts[category]++;
    }
  }

  // Count thumbnail as an image if present
  if (options?.hasThumbnail) {
    counts.image++;
  }

  const hasModel = counts.model > 0;
  const hasSlicer = counts.slicer > 0;
  const hasImage = counts.image > 0;
  const isComplete = hasModel && hasSlicer && hasImage;

  const missingCategories: CompletenessCategory[] = [];
  if (!hasModel) missingCategories.push("model");
  if (!hasSlicer) missingCategories.push("slicer");
  if (!hasImage) missingCategories.push("image");

  return {
    hasModel,
    hasSlicer,
    hasImage,
    isComplete,
    missingCategories,
    counts,
  };
}

/**
 * Check if a file can be added to a category
 */
export function canAddToCategory(
  files: FileForCompleteness[],
  category: CompletenessCategory,
  options?: CompletenessOptions,
): { allowed: boolean; reason?: string } {
  const status = getCompletenessStatus(files, options);
  const currentCount = status.counts[category];
  const limit = getCategoryLimit(category);

  if (currentCount >= limit) {
    const categoryLabels: Record<CompletenessCategory, string> = {
      model: "model files",
      slicer: "slicer file",
      image: "preview image",
    };

    if (category === "slicer") {
      return {
        allowed: false,
        reason:
          "This version already has a slicer file. Create a new version to use different settings.",
      };
    }

    if (category === "image") {
      return {
        allowed: false,
        reason: "This version already has a preview image.",
      };
    }

    return {
      allowed: false,
      reason: `Maximum ${categoryLabels[category]} limit reached.`,
    };
  }

  return { allowed: true };
}

/**
 * Grace period for file removal (24 hours)
 */
const GRACE_PERIOD_HOURS = 24;

/**
 * Check if a file can be removed (within grace period)
 */
export function canRemoveFile(file: FileForCompleteness): {
  allowed: boolean;
  reason?: string;
  hoursRemaining?: number;
} {
  const createdAt = typeof file.createdAt === "string" ? new Date(file.createdAt) : file.createdAt;
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceCreation > GRACE_PERIOD_HOURS) {
    return {
      allowed: false,
      reason: `This file was added more than ${GRACE_PERIOD_HOURS} hours ago and cannot be removed.`,
    };
  }

  const hoursRemaining = Math.ceil(GRACE_PERIOD_HOURS - hoursSinceCreation);

  return {
    allowed: true,
    hoursRemaining,
  };
}

/**
 * Get human-readable time remaining in grace period
 */
export function formatGracePeriodRemaining(hoursRemaining: number): string {
  if (hoursRemaining <= 1) {
    const minutes = Math.ceil(hoursRemaining * 60);
    return `${minutes}m remaining`;
  }

  return `${hoursRemaining}h remaining`;
}

/**
 * Category display info for UI
 */
export const COMPLETENESS_CATEGORY_INFO: Record<
  CompletenessCategory,
  {
    label: string;
    singularLabel: string;
    description: string;
    addLabel: string;
    extensions: readonly string[];
  }
> = {
  model: {
    label: "Model Files",
    singularLabel: "Model",
    description: "3D printable mesh files",
    addLabel: "Add Model",
    extensions: COMPLETENESS_EXTENSIONS.model,
  },
  slicer: {
    label: "Slicer File",
    singularLabel: "Slicer",
    description: "Container with print settings",
    addLabel: "Add 3MF",
    extensions: COMPLETENESS_EXTENSIONS.slicer,
  },
  image: {
    label: "Preview Image",
    singularLabel: "Image",
    description: "Preview image for the model",
    addLabel: "Add Image",
    extensions: COMPLETENESS_EXTENSIONS.image,
  },
};

/**
 * Get accepted file types for a category (for file input accept attribute)
 */
export function getAcceptedTypesForCategory(category: CompletenessCategory): string {
  const extensions = COMPLETENESS_EXTENSIONS[category];
  return extensions.map((ext) => `.${ext}`).join(",");
}

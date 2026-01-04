/**
 * Format bytes to human-readable storage size
 */
export const formatStorage = (bytes: number): string => {
  if (bytes < 1_048_576) {
    // Less than 1 MB
    const kb = bytes / 1024;
    return `${kb.toFixed(0)} KB`;
  }
  if (bytes < 1_073_741_824) {
    // Less than 1 GB
    const mb = bytes / 1_048_576;
    return `${mb.toFixed(0)} MB`;
  }
  const gb = bytes / 1_073_741_824;
  return `${gb.toFixed(1)} GB`;
};

/**
 * Format price as currency
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

/**
 * Format percentage with rounding
 */
export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

/**
 * Get color class for usage percentage
 */
export const getUsageColor = (percentage: number): string => {
  if (percentage >= 90) return "text-red-600 dark:text-red-400";
  if (percentage >= 75) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
};

/**
 * Get background color class for usage progress bar
 */
export const getUsageProgressColor = (percentage: number): string => {
  if (percentage >= 90) return "bg-red-600 dark:bg-red-400";
  if (percentage >= 75) return "bg-yellow-600 dark:bg-yellow-400";
  return "bg-green-600 dark:bg-green-400";
};

/**
 * Get tier display name (capitalize first letter)
 */
export const getTierDisplayName = (tier: string | null | undefined): string => {
  if (!tier) return "Free";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
};

/**
 * Check if user is at limit
 */
export const isAtLimit = (used: number, limit: number): boolean => {
  return used >= limit;
};

/**
 * Generates a unique error ID for client-side error correlation.
 * Format: ERR-{unix_timestamp}-{random_4_chars}
 * Example: ERR-1736112000-a4f2
 *
 * This ID can be used to correlate errors in BetterStack logs
 * by searching for the error ID or approximate timestamp.
 */
export function generateErrorId(): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).substring(2, 6);
  return `ERR-${timestamp}-${random}`;
}

/**
 * Extracts the timestamp from an error ID.
 * Returns null if the error ID format is invalid.
 */
export function parseErrorIdTimestamp(errorId: string): Date | null {
  const match = errorId.match(/^ERR-(\d+)-[a-z0-9]+$/i);
  if (!match?.[1]) return null;
  const timestamp = Number.parseInt(match[1], 10);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp * 1000);
}

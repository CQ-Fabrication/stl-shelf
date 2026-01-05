/**
 * Temporary storage for consent preferences during magic link flow
 *
 * Stores consent choices in localStorage when magic link is requested,
 * then retrieves them when the magic link is clicked.
 */

const STORAGE_KEY = "stl_shelf_pending_consent";
const TTL_MS = 15 * 60 * 1000; // 15 minutes (matches magic link expiry)

type PendingConsent = {
  termsPrivacyVersion: string;
  marketingAccepted: boolean;
  fingerprint: string;
  expiresAt: number;
};

/**
 * Store pending consent preferences
 */
export function storePendingConsent(
  termsPrivacyVersion: string,
  marketingAccepted: boolean,
  fingerprint: string,
): void {
  if (typeof window === "undefined") return;

  const data: PendingConsent = {
    termsPrivacyVersion,
    marketingAccepted,
    fingerprint,
    expiresAt: Date.now() + TTL_MS,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be unavailable
  }
}

/**
 * Retrieve and clear pending consent preferences
 * Returns null if expired or not found
 */
export function consumePendingConsent(): Omit<PendingConsent, "expiresAt"> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as PendingConsent;

    // Clear the stored consent
    localStorage.removeItem(STORAGE_KEY);

    // Check if expired
    if (Date.now() > data.expiresAt) {
      return null;
    }

    return {
      termsPrivacyVersion: data.termsPrivacyVersion,
      marketingAccepted: data.marketingAccepted,
      fingerprint: data.fingerprint,
    };
  } catch {
    return null;
  }
}

/**
 * Clear any pending consent (e.g., on logout)
 */
export function clearPendingConsent(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Canvas fingerprint generation for consent audit trail
 *
 * Generates a unique fingerprint based on canvas rendering characteristics.
 * This is used for GDPR audit purposes to help identify the device/browser
 * that gave consent.
 */

/**
 * Generate a canvas-based fingerprint
 * Returns a SHA-256 hash of the canvas data URL
 */
export async function generateFingerprint(): Promise<string> {
  // SSR safety check
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "server-side";
  }

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return "canvas-unavailable";
    }

    // Set canvas size
    canvas.width = 200;
    canvas.height = 50;

    // Draw text with specific font settings
    ctx.textBaseline = "alphabetic";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);

    ctx.fillStyle = "#069";
    ctx.fillText("STL Shelf Consent", 2, 15);

    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Canvas Fingerprint", 4, 45);

    // Get canvas data
    const dataUrl = canvas.toDataURL();

    // Hash the data URL using SHA-256
    const hash = await sha256(dataUrl);

    return hash;
  } catch {
    return "fingerprint-error";
  }
}

/**
 * SHA-256 hash function using Web Crypto API
 */
async function sha256(message: string): Promise<string> {
  // Encode the message as UTF-8
  const msgBuffer = new TextEncoder().encode(message);

  // Hash the message
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

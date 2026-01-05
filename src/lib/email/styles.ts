/**
 * Centralized email styles for STL Shelf
 * Matches the brand colors and styling from the main site (light theme)
 */

// Brand colors matching the site
export const colors = {
  // Primary brand
  brand: "#f97316", // orange-500

  // Light theme
  background: "#ffffff",
  foreground: "#09090b", // zinc-950
  muted: "#71717a", // zinc-500
  border: "#e4e4e7", // zinc-200
  secondary: "#f4f4f5", // zinc-100

  // Utility
  white: "#ffffff",

  // Warning (for password reset)
  warningBg: "#fef3c7", // amber-100
  warningBorder: "#fcd34d", // amber-300
  warningText: "#92400e", // amber-800
} as const;

// Base font stack
export const fontFamily =
  "'Inter', 'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// Reusable text styles
export const textStyles = {
  heading: {
    color: colors.foreground,
    fontSize: "24px",
    fontWeight: "600" as const,
    lineHeight: "1.3",
    margin: "0 0 24px 0",
  },
  paragraph: {
    color: colors.foreground,
    fontSize: "16px",
    lineHeight: "1.6",
    margin: "0 0 16px 0",
  },
  muted: {
    color: colors.muted,
    fontSize: "14px",
    lineHeight: "1.5",
    margin: "24px 0 0 0",
  },
  link: {
    color: colors.brand,
    textDecoration: "underline",
  },
  linkMuted: {
    color: colors.brand,
    wordBreak: "break-all" as const,
  },
} as const;

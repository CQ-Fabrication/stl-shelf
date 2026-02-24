const HYDRATION_MISMATCH_PATTERNS = [
  /minified react error #418/i,
  /hydration failed because the server rendered/i,
  /a tree hydrated but some attributes of the server rendered html didn't match the client properties/i,
  /react hydration mismatch/i,
];

const EXTENSION_MARKER_PATTERNS = [
  /immersive-translate/i,
  /grammarly/i,
  /protonpass/i,
  /google-translate/i,
  /transover/i,
  /deepl/i,
];

export type HydrationDiagnostics = {
  pathname: string;
  htmlAttributes: string[];
  bodyAttributes: string[];
  htmlClasses: string[];
  bodyClasses: string[];
  extensionMarkers: string[];
  prefersReducedMotion: boolean | null;
};

export function isHydrationMismatchMessage(message: string): boolean {
  return HYDRATION_MISMATCH_PATTERNS.some((pattern) => pattern.test(message));
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "";
}

export function isHydrationMismatchError(error: unknown): boolean {
  return isHydrationMismatchMessage(getErrorMessage(error));
}

function collectAttributes(el: Element | null): string[] {
  if (!el) return [];
  return Array.from(el.attributes)
    .map((attr) => attr.name)
    .sort();
}

function collectClasses(el: Element | null): string[] {
  if (!el) return [];

  return Array.from(el.classList).sort();
}

export function getExtensionMarkerMatches(tokens: string[]): string[] {
  return tokens.filter((token) => EXTENSION_MARKER_PATTERNS.some((pattern) => pattern.test(token)));
}

function collectDomMarkerMatches(): string[] {
  if (typeof document === "undefined") return [];

  const markerCandidates: string[] = [];
  markerCandidates.push(...collectAttributes(document.documentElement));
  markerCandidates.push(...collectAttributes(document.body));
  markerCandidates.push(...collectClasses(document.documentElement));
  markerCandidates.push(...collectClasses(document.body));

  // Capture obvious third-party markers injected in the DOM.
  const injectedNodes = document.querySelectorAll(
    [
      '[class*="immersive-translate"]',
      '[id*="immersive-translate"]',
      "[data-immersive-translate]",
      '[class*="grammarly"]',
      '[id*="grammarly"]',
      "[data-grammarly]",
      "[data-protonpass-form]",
      '[class*="protonpass"]',
      '[id*="protonpass"]',
    ].join(", "),
  );
  for (const node of Array.from(injectedNodes).slice(0, 5)) {
    if (node.id) markerCandidates.push(node.id);
    markerCandidates.push(...Array.from(node.classList));
  }

  return Array.from(new Set(getExtensionMarkerMatches(markerCandidates))).sort();
}

function getPrefersReducedMotion(): boolean | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function collectHydrationDiagnostics(): HydrationDiagnostics {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      pathname: "",
      htmlAttributes: [],
      bodyAttributes: [],
      htmlClasses: [],
      bodyClasses: [],
      extensionMarkers: [],
      prefersReducedMotion: null,
    };
  }

  return {
    pathname: window.location.pathname,
    htmlAttributes: collectAttributes(document.documentElement),
    bodyAttributes: collectAttributes(document.body),
    htmlClasses: collectClasses(document.documentElement),
    bodyClasses: collectClasses(document.body),
    extensionMarkers: collectDomMarkerMatches(),
    prefersReducedMotion: getPrefersReducedMotion(),
  };
}

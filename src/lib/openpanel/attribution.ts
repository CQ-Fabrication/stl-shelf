type OpenPanelGlobalClient = {
  setGlobalProperties: (properties: Record<string, unknown>) => void;
};

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "msclkid",
  "ttclid",
] as const;

type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

type AttributionTouch = Partial<Record<AttributionKey, string>> & {
  landing_path?: string;
  landing_url?: string;
  referrer?: string;
  captured_at?: string;
};

const FIRST_TOUCH_STORAGE_KEY = "openpanel:first_touch_attribution";
const LAST_TOUCH_STORAGE_KEY = "openpanel:last_touch_attribution";

const readTouch = (storageKey: string): AttributionTouch | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttributionTouch;
    return typeof parsed === "object" && parsed ? parsed : null;
  } catch {
    return null;
  }
};

const writeTouch = (storageKey: string, value: AttributionTouch) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore storage failures (private mode, blocked storage)
  }
};

const hasAttribution = (touch: AttributionTouch): boolean => {
  return ATTRIBUTION_KEYS.some((key) => Boolean(touch[key]));
};

const clean = (value: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const extractTouchFromCurrentUrl = (): AttributionTouch | null => {
  if (typeof window === "undefined") return null;
  const search = new URLSearchParams(window.location.search);

  const touch: AttributionTouch = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = clean(search.get(key));
    if (value) touch[key] = value;
  }

  if (!hasAttribution(touch)) {
    return null;
  }

  touch.landing_path = window.location.pathname;
  touch.landing_url = `${window.location.pathname}${window.location.search}`;
  touch.referrer = clean(document.referrer) ?? undefined;
  touch.captured_at = new Date().toISOString();
  return touch;
};

const getAttributionState = (): {
  firstTouch: AttributionTouch | null;
  lastTouch: AttributionTouch | null;
} => {
  const firstTouch = readTouch(FIRST_TOUCH_STORAGE_KEY);
  let lastTouch = readTouch(LAST_TOUCH_STORAGE_KEY);
  const latestTouch = extractTouchFromCurrentUrl();

  if (latestTouch) {
    lastTouch = latestTouch;
    writeTouch(LAST_TOUCH_STORAGE_KEY, latestTouch);
    if (!firstTouch) {
      writeTouch(FIRST_TOUCH_STORAGE_KEY, latestTouch);
      return { firstTouch: latestTouch, lastTouch };
    }
  }

  return { firstTouch, lastTouch };
};

const mapTouchProperties = (
  prefix: string,
  touch: AttributionTouch | null,
): Record<string, unknown> => {
  if (!touch) return {};

  const props: Record<string, unknown> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = touch[key];
    if (value) {
      props[`${prefix}${key}`] = value;
    }
  }

  if (touch.landing_path) props[`${prefix}landing_path`] = touch.landing_path;
  if (touch.landing_url) props[`${prefix}landing_url`] = touch.landing_url;
  if (touch.referrer) props[`${prefix}referrer`] = touch.referrer;
  if (touch.captured_at) props[`${prefix}captured_at`] = touch.captured_at;

  return props;
};

export const getAttributionProperties = (): Record<string, unknown> => {
  const { firstTouch, lastTouch } = getAttributionState();

  return {
    ...mapTouchProperties("", lastTouch),
    ...mapTouchProperties("first_", firstTouch),
  };
};

export const getAttributionProfileProperties = (): Record<string, unknown> => {
  const { firstTouch } = getAttributionState();
  return mapTouchProperties("first_", firstTouch);
};

export const getLastTouchAttribution = (): Partial<Record<AttributionKey, string>> => {
  const { lastTouch } = getAttributionState();
  if (!lastTouch) return {};

  const payload: Partial<Record<AttributionKey, string>> = {};
  for (const key of ATTRIBUTION_KEYS) {
    if (lastTouch[key]) {
      payload[key] = lastTouch[key];
    }
  }
  return payload;
};

export const applyOpenPanelAttribution = (
  client: OpenPanelGlobalClient,
  baseProperties: Record<string, unknown> = {},
) => {
  client.setGlobalProperties({
    ...baseProperties,
    ...getAttributionProperties(),
  });
};

import { createServerFn } from "@tanstack/react-start";
import {
  type AddonKind,
  type AddonSlug,
  BILLING_ADDONS,
  BILLING_INTERVALS,
  SUBSCRIPTION_TIERS,
  type BillingInterval,
} from "@/lib/billing/config";
import { getProductIdForAddonSlug } from "@/lib/billing/addons";
import { env } from "@/lib/env";
import { logErrorEvent } from "@/lib/logging";
import { polarService } from "@/server/services/billing/polar.service";

const CACHE_TTL_MS = 5 * 60 * 1000;
// When some price is unavailable, retry sooner instead of caching the outage.
const DEGRADED_CACHE_TTL_MS = 30 * 1000;

const tierOrder = ["free", "basic", "pro"] as const;

type TierSlug = (typeof tierOrder)[number];

export type PricingTier = {
  slug: TierSlug;
  name: string;
  description: string | null;
  benefits: string[];
  /** null = price unavailable for that interval (no live fetch, no last-known-good) */
  prices: Record<BillingInterval, PricingTierPrice | null>;
};

export type PricingTierPrice = {
  amount: number;
  currency: string;
  interval: BillingInterval | null;
  intervalCount: number | null;
};

export type PublicPricingResponse = {
  updatedAt: string;
  source: "polar" | "fallback";
  tiers: PricingTier[];
};

/**
 * Fetch a display value from Polar with last-known-good semantics.
 *
 * - Fresh fetch succeeds: store it as last-known-good and return it.
 * - Fetch fails (or there is nothing to fetch): report to BetterStack and fall
 *   back to the last-known-good value IF one exists - it DID come from Polar.
 * - Neither: return null (the item is unavailable; display must never
 *   substitute a static config price).
 */
export async function resolveWithLastKnown<T>({
  surface,
  slug,
  lastKnown,
  key,
  fetchValue,
}: {
  surface: string;
  slug: string;
  lastKnown: Map<string, T>;
  key: string;
  /** null when there is no product id to fetch */
  fetchValue: (() => Promise<T | null>) | null;
}): Promise<{ value: T | null; live: boolean }> {
  if (fetchValue) {
    try {
      const value = await fetchValue();
      if (value !== null) {
        lastKnown.set(key, value);
        return { value, live: true };
      }
      logErrorEvent("billing.pricing.fetch_failed", {
        surface,
        slug,
        message: "No active price on Polar product",
      });
    } catch (error) {
      logErrorEvent("billing.pricing.fetch_failed", {
        surface,
        slug,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const stale = lastKnown.get(key);
  return { value: stale ?? null, live: false };
}

function extractPrice(product: {
  prices: Array<Record<string, unknown>>;
}): { amount: number; currency: string } | null {
  const activePrice = product.prices.find((price) => {
    if (typeof price !== "object" || price === null) return false;
    if (!("isArchived" in price)) return true;
    return price.isArchived !== true;
  }) as Record<string, unknown> | undefined;

  if (!activePrice) return null;

  const amountType = typeof activePrice.amountType === "string" ? activePrice.amountType : null;
  if (amountType === "fixed") {
    const amount = typeof activePrice.priceAmount === "number" ? activePrice.priceAmount : null;
    const currency =
      typeof activePrice.priceCurrency === "string" ? activePrice.priceCurrency : "USD";
    if (amount === null) return null;
    return { amount, currency };
  }

  if (amountType === "free") {
    return { amount: 0, currency: "USD" };
  }

  return null;
}

const FREE_PRICE: PricingTierPrice = {
  amount: 0,
  currency: "USD",
  interval: null,
  intervalCount: null,
};

function buildFreeTier(): PricingTier {
  const config = SUBSCRIPTION_TIERS.free;
  return {
    slug: "free",
    name: config.name,
    description: null,
    benefits: config.features,
    prices: { month: FREE_PRICE, year: FREE_PRICE },
  };
}

/** What we remember per paid tier + interval: the price plus display metadata */
type TierIntervalSnapshot = {
  price: PricingTierPrice;
  name: string | null;
  description: string | null;
  benefits: string[] | null;
};

const lastKnownTierSnapshots = new Map<string, TierIntervalSnapshot>();

let cachedPricing: { data: PublicPricingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

const PAID_TIER_PRODUCT_IDS: Record<
  Exclude<TierSlug, "free">,
  Record<BillingInterval, string | undefined>
> = {
  basic: {
    month: env.POLAR_PRODUCT_BASIC_MONTH ?? env.POLAR_PRODUCT_BASIC,
    year: env.POLAR_PRODUCT_BASIC_YEAR,
  },
  pro: {
    month: env.POLAR_PRODUCT_PRO_MONTH ?? env.POLAR_PRODUCT_PRO,
    year: env.POLAR_PRODUCT_PRO_YEAR,
  },
};

async function fetchTierIntervalSnapshot(
  productId: string,
  interval: BillingInterval,
): Promise<TierIntervalSnapshot | null> {
  const product = await polarService.getProduct(productId);
  const price = extractPrice({ prices: product.prices as Array<Record<string, unknown>> });
  if (!price) return null;

  const benefits = product.benefits?.length
    ? product.benefits.map((benefit) => benefit.description).filter(Boolean)
    : null;

  return {
    price: {
      amount: price.amount,
      currency: price.currency,
      interval: price.amount === 0 ? null : interval,
      intervalCount: price.amount === 0 ? null : (product.recurringIntervalCount ?? 1),
    },
    name: product.name ?? null,
    description: product.description ?? null,
    benefits,
  };
}

async function buildPaidTier(slug: Exclude<TierSlug, "free">): Promise<PricingTier> {
  const config = SUBSCRIPTION_TIERS[slug];

  const snapshots = await Promise.all(
    BILLING_INTERVALS.map(async (interval) => {
      const productId = PAID_TIER_PRODUCT_IDS[slug][interval];
      const { value } = await resolveWithLastKnown<TierIntervalSnapshot>({
        surface: "tiers",
        slug: `${slug}_${interval}`,
        lastKnown: lastKnownTierSnapshots,
        key: `${slug}:${interval}`,
        fetchValue: productId ? () => fetchTierIntervalSnapshot(productId, interval) : null,
      });
      return { interval, snapshot: value };
    }),
  );

  const monthSnapshot = snapshots.find((entry) => entry.interval === "month")?.snapshot ?? null;
  const yearSnapshot = snapshots.find((entry) => entry.interval === "year")?.snapshot ?? null;
  const metadata = monthSnapshot ?? yearSnapshot;

  const prices: Record<BillingInterval, PricingTierPrice | null> = { month: null, year: null };
  for (const entry of snapshots) {
    prices[entry.interval] = entry.snapshot?.price ?? null;
  }

  return {
    slug,
    name: metadata?.name ?? config.name,
    description: metadata?.description ?? null,
    benefits: metadata?.benefits?.length ? metadata.benefits : config.features,
    prices,
  };
}

export const getPublicPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicPricingResponse> => {
    const now = Date.now();
    if (cachedPricing.data && cachedPricing.expiresAt > now) {
      return cachedPricing.data;
    }

    const paidTiers = await Promise.all([buildPaidTier("basic"), buildPaidTier("pro")]);
    const tiers: PricingTier[] = [buildFreeTier(), ...paidTiers];

    const anyUnavailable = paidTiers.some((tier) =>
      BILLING_INTERVALS.some((interval) => tier.prices[interval] === null),
    );

    const response: PublicPricingResponse = {
      updatedAt: new Date().toISOString(),
      source: anyUnavailable ? "fallback" : "polar",
      tiers,
    };

    cachedPricing = {
      data: response,
      expiresAt: now + (anyUnavailable ? DEGRADED_CACHE_TTL_MS : CACHE_TTL_MS),
    };

    return response;
  },
);

export type AddonPricing = {
  slug: AddonSlug;
  kind: AddonKind;
  label: string;
  /** Price in minor units (cents); null when unavailable */
  price: { amount: number; currency: string } | null;
  /** true when neither a fresh Polar fetch nor a last-known-good price exists */
  unavailable: boolean;
};

export type AddonPricingResponse = {
  updatedAt: string;
  source: "polar" | "fallback";
  addons: AddonPricing[];
};

const ADDON_SLUGS = Object.keys(BILLING_ADDONS) as AddonSlug[];

const lastKnownAddonPrices = new Map<string, { amount: number; currency: string }>();

let cachedAddonPricing: { data: AddonPricingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

/**
 * Resolve display prices for every add-on. Prices come from Polar (fresh or
 * last-known-good); an add-on with neither is marked unavailable - static
 * catalog prices are never substituted for display.
 */
export async function resolveAddonPricingItems({
  fetchPrice,
  getProductId,
  lastKnown,
}: {
  fetchPrice: (productId: string) => Promise<{ amount: number; currency: string } | null>;
  getProductId: (slug: AddonSlug) => string | undefined;
  lastKnown: Map<string, { amount: number; currency: string }>;
}): Promise<AddonPricing[]> {
  return Promise.all(
    ADDON_SLUGS.map(async (slug): Promise<AddonPricing> => {
      const config = BILLING_ADDONS[slug];
      const productId = getProductId(slug);

      const { value } = await resolveWithLastKnown({
        surface: "addons",
        slug,
        lastKnown,
        key: slug,
        fetchValue: productId ? () => fetchPrice(productId) : null,
      });

      return {
        slug,
        kind: config.kind,
        label: config.label,
        price: value,
        unavailable: value === null,
      };
    }),
  );
}

async function fetchAddonPrice(
  productId: string,
): Promise<{ amount: number; currency: string } | null> {
  const product = await polarService.getProduct(productId);
  return extractPrice({ prices: product.prices as Array<Record<string, unknown>> });
}

// Add-on pricing, fetched live from Polar. No static display fallback: an
// add-on without a fresh or last-known-good Polar price is unavailable.
export const getAddonPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<AddonPricingResponse> => {
    const now = Date.now();
    if (cachedAddonPricing.data && cachedAddonPricing.expiresAt > now) {
      return cachedAddonPricing.data;
    }

    const addons = await resolveAddonPricingItems({
      fetchPrice: fetchAddonPrice,
      getProductId: getProductIdForAddonSlug,
      lastKnown: lastKnownAddonPrices,
    });

    const anyUnavailable = addons.some((addon) => addon.unavailable);

    const response: AddonPricingResponse = {
      updatedAt: new Date().toISOString(),
      source: anyUnavailable ? "fallback" : "polar",
      addons,
    };

    cachedAddonPricing = {
      data: response,
      expiresAt: now + (anyUnavailable ? DEGRADED_CACHE_TTL_MS : CACHE_TTL_MS),
    };

    return response;
  },
);

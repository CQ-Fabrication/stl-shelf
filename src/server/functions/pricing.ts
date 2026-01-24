import { createServerFn } from "@tanstack/react-start";
import { SUBSCRIPTION_TIERS } from "@/lib/billing/config";
import { env } from "@/lib/env";
import { polarService } from "@/server/services/billing/polar.service";

const CACHE_TTL_MS = 5 * 60 * 1000;

const tierOrder = ["free", "basic", "pro"] as const;

type TierSlug = (typeof tierOrder)[number];

type PricingTier = {
  slug: TierSlug;
  name: string;
  description: string | null;
  priceAmount: number;
  priceCurrency: string;
  interval: string | null;
  intervalCount: number | null;
  benefits: string[];
};

type PublicPricingResponse = {
  updatedAt: string;
  source: "polar" | "fallback";
  tiers: PricingTier[];
};

let cachedPricing: { data: PublicPricingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

function buildFallbackTier(slug: TierSlug): PricingTier {
  const fallback = SUBSCRIPTION_TIERS[slug];
  return {
    slug,
    name: fallback.name,
    description: null,
    priceAmount: Math.round(fallback.price * 100),
    priceCurrency: "USD",
    interval: fallback.price === 0 ? null : "month",
    intervalCount: fallback.price === 0 ? null : 1,
    benefits: fallback.features,
  };
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

export const getPublicPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicPricingResponse> => {
    const now = Date.now();
    if (cachedPricing.data && cachedPricing.expiresAt > now) {
      return cachedPricing.data;
    }

    const fallbackTiers = tierOrder.map(buildFallbackTier);

    try {
      const productIds: Record<TierSlug, string | undefined> = {
        free: env.POLAR_PRODUCT_FREE,
        basic: env.POLAR_PRODUCT_BASIC,
        pro: env.POLAR_PRODUCT_PRO,
      };

      const tiers = await Promise.all(
        tierOrder.map(async (slug) => {
          const productId = productIds[slug];
          if (!productId) {
            return buildFallbackTier(slug);
          }

          const product = await polarService.getProduct(productId);
          const price = extractPrice({ prices: product.prices as Array<Record<string, unknown>> });
          const fallback = buildFallbackTier(slug);
          const benefits = product.benefits?.length
            ? product.benefits.map((benefit) => benefit.description).filter(Boolean)
            : fallback.benefits;

          return {
            slug,
            name: product.name ?? fallback.name,
            description: product.description ?? null,
            priceAmount: price?.amount ?? fallback.priceAmount,
            priceCurrency: price?.currency ?? fallback.priceCurrency,
            interval: product.recurringInterval ?? fallback.interval,
            intervalCount: product.recurringIntervalCount ?? fallback.intervalCount,
            benefits,
          } satisfies PricingTier;
        }),
      );

      const response: PublicPricingResponse = {
        updatedAt: new Date().toISOString(),
        source: "polar",
        tiers,
      };

      cachedPricing = {
        data: response,
        expiresAt: now + CACHE_TTL_MS,
      };

      return response;
    } catch (error) {
      console.warn("Failed to load Polar pricing, using fallback:", error);

      const response: PublicPricingResponse = {
        updatedAt: new Date().toISOString(),
        source: "fallback",
        tiers: fallbackTiers,
      };

      cachedPricing = {
        data: response,
        expiresAt: now + CACHE_TTL_MS,
      };

      return response;
    }
  },
);

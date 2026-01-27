import { createServerFn } from "@tanstack/react-start";
import { BILLING_INTERVALS, SUBSCRIPTION_TIERS, type BillingInterval } from "@/lib/billing/config";
import { env } from "@/lib/env";
import { polarService } from "@/server/services/billing/polar.service";

const CACHE_TTL_MS = 5 * 60 * 1000;

const tierOrder = ["free", "basic", "pro"] as const;

type TierSlug = (typeof tierOrder)[number];

export type PricingTier = {
  slug: TierSlug;
  name: string;
  description: string | null;
  benefits: string[];
  prices: Record<BillingInterval, PricingTierPrice>;
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

let cachedPricing: { data: PublicPricingResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

function buildFallbackTier(slug: TierSlug): PricingTier {
  const fallback = SUBSCRIPTION_TIERS[slug];
  const buildPrice = (interval: BillingInterval): PricingTierPrice => {
    const basePrice = interval === "year" ? fallback.priceYearly : fallback.priceMonthly;
    if (basePrice === 0) {
      return { amount: 0, currency: "USD", interval: null, intervalCount: null };
    }
    return {
      amount: Math.round(basePrice * 100),
      currency: "USD",
      interval,
      intervalCount: 1,
    };
  };
  return {
    slug,
    name: fallback.name,
    description: null,
    benefits: fallback.features,
    prices: {
      month: buildPrice("month"),
      year: buildPrice("year"),
    },
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

function buildPriceDetails({
  amount,
  currency,
  interval,
  intervalCount,
}: {
  amount: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number | null;
}): PricingTierPrice {
  if (amount === 0) {
    return { amount, currency, interval: null, intervalCount: null };
  }
  return {
    amount,
    currency,
    interval,
    intervalCount: intervalCount ?? 1,
  };
}

export const getPublicPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicPricingResponse> => {
    const now = Date.now();
    if (cachedPricing.data && cachedPricing.expiresAt > now) {
      return cachedPricing.data;
    }

    const fallbackTiers = tierOrder.map(buildFallbackTier);

    try {
      const productIds: Record<TierSlug, Record<BillingInterval, string | undefined>> = {
        free: {
          month: env.POLAR_PRODUCT_FREE,
          year: env.POLAR_PRODUCT_FREE,
        },
        basic: {
          month: env.POLAR_PRODUCT_BASIC_MONTH ?? env.POLAR_PRODUCT_BASIC,
          year: env.POLAR_PRODUCT_BASIC_YEAR,
        },
        pro: {
          month: env.POLAR_PRODUCT_PRO_MONTH ?? env.POLAR_PRODUCT_PRO,
          year: env.POLAR_PRODUCT_PRO_YEAR,
        },
      };

      const tiers = await Promise.all(
        tierOrder.map(async (slug) => {
          const fallback = buildFallbackTier(slug);
          const intervalResults = await Promise.all(
            BILLING_INTERVALS.map(async (interval) => {
              const intervalKey = interval as BillingInterval;
              const productId = productIds[slug][intervalKey];
              if (!productId) return null;
              const product = await polarService.getProduct(productId);
              const price = extractPrice({
                prices: product.prices as Array<Record<string, unknown>>,
              });
              return { interval: intervalKey, product, price };
            }),
          );

          let name = fallback.name;
          let description = fallback.description;
          let benefits = fallback.benefits;
          const prices = { ...fallback.prices };

          intervalResults.forEach((result) => {
            if (!result) return;
            const { interval, product, price } = result;
            if (price) {
              prices[interval] = buildPriceDetails({
                amount: price.amount,
                currency: price.currency,
                interval,
                intervalCount: product.recurringIntervalCount ?? 1,
              });
            }

            const productBenefits = product.benefits?.length
              ? product.benefits.map((benefit) => benefit.description).filter(Boolean)
              : null;

            if (interval === "month") {
              name = product.name ?? name;
              description = product.description ?? description;
              benefits = productBenefits?.length ? productBenefits : benefits;
              return;
            }

            if (name === fallback.name && product.name) name = product.name;
            if (description === fallback.description && product.description)
              description = product.description;
            if (benefits === fallback.benefits && productBenefits?.length) {
              benefits = productBenefits;
            }
          });

          return {
            slug,
            name,
            description,
            benefits,
            prices,
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

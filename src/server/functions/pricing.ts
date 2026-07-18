import { createServerFn } from "@tanstack/react-start";
import { loadAddonPricing, loadPublicPricing } from "@/server/services/billing/pricing-resolver";

// This module is imported by client code (server-fn RPC stubs + types), so it
// must export NOTHING but createServerFn definitions and types: any other
// runtime export would drag the server-only resolver (env, logging, Polar)
// into the client bundle and break hydration.
export type {
  AddonPricing,
  AddonPricingResponse,
  PricingTier,
  PricingTierPrice,
  PublicPricingResponse,
} from "@/server/services/billing/pricing-resolver";

export const getPublicPricing = createServerFn({ method: "GET" }).handler(() =>
  loadPublicPricing(),
);

export const getAddonPricing = createServerFn({ method: "GET" }).handler(() => loadAddonPricing());

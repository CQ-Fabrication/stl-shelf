import { env } from "@/lib/env";
import { type AddonSlug, BILLING_ADDONS, type BillingAddon } from "./config";

/**
 * Server-side product ID to add-on mapping.
 *
 * Reads the POLAR_PRODUCT_* env vars (server-only), so this module MUST NOT be
 * imported from client code - it would leak the product IDs into the bundle.
 * The catalog itself (`BILLING_ADDONS`) lives in the client-safe `./config`.
 */
export function getAddonFromProductId(productId: string): BillingAddon | undefined {
  if (env.POLAR_PRODUCT_STORAGE_100_GB && productId === env.POLAR_PRODUCT_STORAGE_100_GB) {
    return BILLING_ADDONS.storage_100gb;
  }
  if (env.POLAR_PRODUCT_STORAGE_500_GB && productId === env.POLAR_PRODUCT_STORAGE_500_GB) {
    return BILLING_ADDONS.storage_500gb;
  }
  if (env.POLAR_PRODUCT_STORAGE_1_TB && productId === env.POLAR_PRODUCT_STORAGE_1_TB) {
    return BILLING_ADDONS.storage_1tb;
  }
  if (env.POLAR_PRODUCT_SEAT_SINGLE && productId === env.POLAR_PRODUCT_SEAT_SINGLE) {
    return BILLING_ADDONS.seat_single;
  }
  if (env.POLAR_PRODUCT_SEATS_PACK && productId === env.POLAR_PRODUCT_SEATS_PACK) {
    return BILLING_ADDONS.seats_pack;
  }
  return undefined;
}

/** Reverse mapping: add-on slug to its Polar product id (server-only). */
export function getProductIdForAddonSlug(slug: AddonSlug): string | undefined {
  switch (slug) {
    case "storage_100gb":
      return env.POLAR_PRODUCT_STORAGE_100_GB;
    case "storage_500gb":
      return env.POLAR_PRODUCT_STORAGE_500_GB;
    case "storage_1tb":
      return env.POLAR_PRODUCT_STORAGE_1_TB;
    case "seat_single":
      return env.POLAR_PRODUCT_SEAT_SINGLE;
    case "seats_pack":
      return env.POLAR_PRODUCT_SEATS_PACK;
  }
}

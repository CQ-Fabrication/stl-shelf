/**
 * Subscription tier configuration - matches backend
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    members: "1 user",
    storage: "100 MB",
    models: "20 models",
    features: [
      "1 user (you)",
      "100 MB storage",
      "20 models",
      "Community support",
    ],
  },
  basic: {
    name: "Basic",
    price: 4.99,
    members: "Up to 5 team members",
    storage: "5 GB",
    models: "100 models",
    features: [
      "Up to 5 team members",
      "5 GB storage",
      "100 models",
      "Priority email support",
      "Advanced features",
    ],
  },
  pro: {
    name: "Pro",
    price: 12.99,
    members: "Up to 10 team members",
    storage: "20 GB",
    models: "1,000 models",
    features: [
      "Up to 10 team members",
      "20 GB storage",
      "1,000 models",
      "Premium support",
      "All features",
      "API access",
    ],
  },
} as const satisfies Record<
  string,
  {
    name: string;
    price: number;
    members: string;
    storage: string;
    models: string;
    features: string[];
  }
>;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

import Stripe from "stripe";

// Stripe instance - will be created when needed (not at build time)
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });
  }
  return stripeInstance;
}

// For backwards compatibility - lazy initialization
export const stripe = {
  get checkout() { return getStripe().checkout; },
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get billingPortal() { return getStripe().billingPortal; },
  get webhooks() { return getStripe().webhooks; },
};

// Plan to Stripe Price ID mapping
export const PLAN_PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID,
  team: process.env.STRIPE_TEAM_PRICE_ID,
} as const;

export type PaidPlan = keyof typeof PLAN_PRICE_IDS;

export function getPriceIdForPlan(plan: PaidPlan): string | undefined {
  return PLAN_PRICE_IDS[plan];
}

export function getPlanFromPriceId(priceId: string): PaidPlan | null {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) {
      return plan as PaidPlan;
    }
  }
  return null;
}

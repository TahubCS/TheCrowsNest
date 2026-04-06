import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getStripePriceId(plan: "premium_monthly" | "premium_annual") {
  const envKey = plan === "premium_monthly" ? "STRIPE_PRICE_MONTHLY_ID" : "STRIPE_PRICE_ANNUAL_ID";
  const priceId = process.env[envKey];

  if (!priceId) {
    throw new Error(`${envKey} is not configured.`);
  }

  return priceId;
}

export function getAppUrl(requestUrl: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }

  return new URL(requestUrl).origin;
}

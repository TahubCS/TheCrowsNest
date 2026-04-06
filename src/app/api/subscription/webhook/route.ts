import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripePlan = "premium_monthly" | "premium_annual" | "free";

function getPlanFromSubscription(subscription: { metadata?: Record<string, string> | null; status?: string }) {
  const plan = subscription.metadata?.plan;
  if (plan === "premium_monthly" || plan === "premium_annual") {
    return plan;
  }

  if (subscription.status === "active" || subscription.status === "trialing" || subscription.status === "past_due") {
    return "premium_monthly";
  }

  return "free";
}

async function upsertProfile(email: string, plan: StripePlan, customerId?: string | null, subscriptionId?: string | null, expiresAt?: number | null) {
  const payload: Record<string, unknown> = {
    email: email.toLowerCase(),
    subscription_plan: plan === "free" ? "free" : "premium",
    stripe_customer_id: customerId ?? null,
    stripe_subscription_id: subscriptionId ?? null,
    plan_expires_at: expiresAt ? new Date(expiresAt * 1000).toISOString() : null,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "email" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    }

    if (!webhookSecret) {
      return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
    }

    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as {
          customer?: string | null;
          customer_details?: { email?: string | null } | null;
          customer_email?: string | null;
          subscription?: string | null;
          metadata?: Record<string, string> | null;
        };

        const email = checkoutSession.customer_details?.email || checkoutSession.customer_email || checkoutSession.metadata?.email;
        if (!email) {
          throw new Error("Stripe checkout session did not include a customer email.");
        }

        const subscriptionId = checkoutSession.subscription ?? null;
        let expiresAt: number | null = null;
        let plan: StripePlan = (checkoutSession.metadata?.plan as StripePlan) || "premium_monthly";
        const customerId = typeof checkoutSession.customer === "string" ? checkoutSession.customer : null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
          expiresAt = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end ?? null;
          plan = getPlanFromSubscription(subscription);
        }

        await upsertProfile(email, plan, customerId, subscriptionId, expiresAt);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as {
          id: string;
          customer?: string | null;
          current_period_end?: number;
          metadata?: Record<string, string> | null;
          status?: string;
        };

        const email = subscription.metadata?.email;
        if (!email) {
          throw new Error("Stripe subscription is missing the customer email metadata.");
        }

        const plan = event.type === "customer.subscription.deleted" ? "free" : getPlanFromSubscription(subscription);
        const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
        const periodEnd = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end ?? null;
        await upsertProfile(email, plan, customerId, subscription.id, plan === "free" ? null : periodEnd);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook Error]", error);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}

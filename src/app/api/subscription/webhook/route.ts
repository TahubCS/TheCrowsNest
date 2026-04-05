/**
 * POST /api/subscription/webhook
 *
 * Handles Stripe webhook events to sync subscription status.
 *
 * TODO: Replace with real Stripe webhook verification and event handling.
 * This is a DUMMY placeholder.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ─── DUMMY IMPLEMENTATION ───────────────────────────────────
    // Replace with real Stripe webhook:
    //
    //   import Stripe from 'stripe';
    //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    //   const sig = request.headers.get('stripe-signature')!;
    //   const body = await request.text();
    //   const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    //
    //   switch (event.type) {
    //     case 'checkout.session.completed':
    //       // upsert profiles row with plan='premium', stripe IDs, expiry
    //       break;
    //     case 'customer.subscription.updated':
    //       // update plan status
    //       break;
    //     case 'customer.subscription.deleted':
    //       // revert plan to 'free'
    //       break;
    //   }
    //
    // ────────────────────────────────────────────────────────────

    console.warn("[Stripe Webhook] DUMMY — not yet implemented.");

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook Error]", error);
    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}

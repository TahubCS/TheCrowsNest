/**
 * POST /api/subscription/create-session
 *
 * Creates a Stripe Checkout Session for the selected plan.
 *
 * TODO: Replace with real Stripe SDK when Stripe is configured.
 * This is a DUMMY placeholder that returns a mock response.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { plan } = await request.json();

    if (!plan || !["premium_monthly", "premium_annual"].includes(plan)) {
      return NextResponse.json<ApiResponse>(
        { success: false, message: "Invalid plan selection." },
        { status: 400 }
      );
    }

    // ─── DUMMY IMPLEMENTATION ───────────────────────────────────
    // Replace this block with real Stripe Checkout Session creation:
    //
    //   import Stripe from 'stripe';
    //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    //   const checkoutSession = await stripe.checkout.sessions.create({
    //     mode: 'subscription',
    //     customer_email: session.user.email,
    //     line_items: [{ price: priceId, quantity: 1 }],
    //     success_url: `${process.env.NEXT_PUBLIC_URL}/account?checkout=success`,
    //     cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing?checkout=cancelled`,
    //   });
    //   return NextResponse.json({ success: true, url: checkoutSession.url });
    //
    // ────────────────────────────────────────────────────────────

    console.warn("[Stripe] DUMMY — create-session called, no real Stripe configured yet.");

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "DUMMY — Stripe not yet configured. This would redirect to checkout.",
      data: {
        url: `/pricing?checkout=pending&plan=${plan}`,
        _note: "Replace with real Stripe Checkout Session URL.",
      },
    });
  } catch (error) {
    console.error("[Subscription Create Error]", error);
    return NextResponse.json<ApiResponse>(
      { success: false, message: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}

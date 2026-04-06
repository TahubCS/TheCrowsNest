import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAppUrl, getStripeClient, getStripePriceId } from "@/lib/stripe";
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

    const stripe = getStripeClient();
    const priceId = getStripePriceId(plan);
    const appUrl = getAppUrl(request.url);
    const successUrl = new URL("/pricing?checkout=success", appUrl).toString();
    const cancelUrl = new URL(`/pricing?checkout=cancelled&plan=${plan}`, appUrl).toString();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: session.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          email: session.user.email.toLowerCase(),
          plan,
        },
      },
      metadata: {
        email: session.user.email.toLowerCase(),
        plan,
      },
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Checkout session created.",
      data: {
        url: checkoutSession.url,
        sessionId: checkoutSession.id,
      },
    });
  } catch (error) {
    console.error("[Subscription Create Error]", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to create checkout session.",
      },
      { status: 500 }
    );
  }
}

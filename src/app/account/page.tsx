"use client";

import Link from "next/link";
import { usePlan } from "@/hooks/usePlan";

export default function AccountPage() {
  const { plan, loading } = usePlan();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Account</h1>
        <p className="text-muted-foreground mt-2">Manage your subscription and billing settings.</p>
      </div>

      <div className={`rounded-2xl border-2 p-6 ${plan === "premium" ? "border-ecu-gold bg-ecu-gold/5" : "border-border bg-background"}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Plan</p>
            {loading ? (
              <p className="text-2xl font-bold text-foreground mt-1">Loading...</p>
            ) : (
              <p className="text-2xl font-bold text-foreground mt-1">{plan === "premium" ? "Premium" : "Free"}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {plan === "premium"
                ? "Renewal and cancellation controls will be wired to Stripe once billing is enabled."
                : "Upgrade to Premium for personal AI tool generation and daily quotas."}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-lg bg-ecu-purple text-white text-sm font-semibold hover:bg-ecu-purple/90"
            >
              {plan === "premium" ? "Manage Subscription" : "Upgrade to Premium"}
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="text-lg font-bold text-foreground">Billing Status</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Stripe checkout and webhooks are currently running in placeholder mode. Once live billing is connected,
          this section will show your renewal date, payment method, and cancellation controls.
        </p>
      </div>
    </div>
  );
}

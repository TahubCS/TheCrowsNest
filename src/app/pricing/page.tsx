"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";


const FREE_FEATURES = [
  { text: "Unlimited material uploads", included: true },
  { text: "Community shared resources", included: true },
  { text: "Pre-generated flashcards", included: true },
  { text: "Pre-generated practice exams", included: true },
  { text: "Pre-generated study plans", included: true },
  { text: "AI Tutor chat", included: false },
  { text: "Custom flashcard generation", included: false },
  { text: "Custom exam generation", included: false },
  { text: "Custom study plan generation", included: false },
  { text: "Material-specific AI tools", included: false },
];

const PREMIUM_FEATURES = [
  { text: "Everything in Free", included: true },
  { text: "AI Tutor chat (25/day)", included: true },
  { text: "Custom flashcard generation (5/day)", included: true },
  { text: "Custom exam generation (5/day)", included: true },
  { text: "Custom study plan generation (5/day)", included: true },
  { text: "Material-specific AI tools", included: true },
  { text: "Priority support", included: true },
];

function PricingContent() {
  const { plan, loading, refetch } = usePlan();
  const searchParams = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "pending") {
      toast.info("Stripe checkout is not yet configured. This is a placeholder.");
    } else if (checkout === "success") {
      toast.success("Payment received. Updating your plan...");
      void refetch();
    } else if (checkout === "cancelled") {
      toast.error("Checkout was cancelled.");
    }
  }, [refetch, searchParams]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await fetch("/api/subscription/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: billingCycle === "monthly" ? "premium_monthly" : "premium_annual" }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error(data.message || "Failed to start checkout.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-ecu-purple inline-flex items-center gap-1 mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground mt-3 text-lg max-w-2xl mx-auto">
            Everyone gets access to shared community resources. Upgrade to Premium for personalized AI-powered study tools.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-muted/50 rounded-full p-1 border border-border">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${billingCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${billingCycle === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Annual <span className="text-xs text-green-600 font-bold ml-1">Save 17%</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ecu-purple" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className={`relative rounded-3xl border-2 p-8 transition-all ${plan === "free" ? "border-ecu-purple bg-ecu-purple/5" : "border-border bg-background"}`}>
              {plan === "free" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-ecu-purple text-white text-xs font-bold">
                  Current Plan
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Free</h2>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold text-foreground">$0</span>
                  <span className="text-muted-foreground ml-1">/forever</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Access shared community resources generated from class materials.
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {FREE_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    {f.included ? (
                      <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>{f.text}</span>
                  </li>
                ))}
              </ul>

              {plan === "free" ? (
                <div className="w-full py-3 rounded-xl border border-border text-center text-sm font-semibold text-muted-foreground">
                  Your Current Plan
                </div>
              ) : (
                <div className="w-full py-3 rounded-xl border border-border text-center text-sm font-semibold text-muted-foreground">
                  Free Tier
                </div>
              )}
            </div>

            {/* Premium Plan */}
            <div className={`relative rounded-3xl border-2 p-8 transition-all ${plan === "premium" ? "border-ecu-gold bg-ecu-gold/5" : "border-ecu-gold/40 bg-background shadow-xl shadow-ecu-gold/5"}`}>
              {plan === "premium" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-ecu-gold text-slate-900 text-xs font-bold">
                  Current Plan
                </div>
              )}
              {plan !== "premium" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-ecu-purple to-ecu-gold text-white text-xs font-bold">
                  Recommended
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Premium</h2>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-ecu-purple to-ecu-gold">
                    {billingCycle === "monthly" ? "$9.99" : "$99.99"}
                  </span>
                  <span className="text-muted-foreground ml-1">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Personalized AI study tools with daily generation quotas.
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {PREMIUM_FEATURES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <svg className="w-5 h-5 text-ecu-gold shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    <span className="text-foreground">{f.text}</span>
                  </li>
                ))}
              </ul>

              {plan === "premium" ? (
                <div className="w-full py-3 rounded-xl border border-ecu-gold/30 bg-ecu-gold/10 text-center text-sm font-bold text-ecu-gold">
                  Your Current Plan
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="w-full py-3 rounded-xl bg-linear-to-r from-ecu-purple to-ecu-gold text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {upgrading ? "Starting checkout..." : "Upgrade to Premium"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <PricingContent />
    </Suspense>
  );
}

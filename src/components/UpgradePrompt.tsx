"use client";

import Link from "next/link";

interface UpgradePromptProps {
  featureName: string;
}

export default function UpgradePrompt({ featureName }: UpgradePromptProps) {
  return (
    <div className="relative rounded-3xl border-2 border-dashed border-ecu-gold/30 bg-ecu-gold/5 p-10 text-center">
      <div className="w-16 h-16 bg-ecu-gold/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-ecu-gold/20">
        <svg className="w-8 h-8 text-ecu-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">Premium Feature</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Upgrade to Premium to {featureName}. Free users can still access the shared community resources above.
      </p>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-ecu-purple to-ecu-gold text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
      >
        <span>👑</span> Upgrade to Premium
      </Link>
    </div>
  );
}

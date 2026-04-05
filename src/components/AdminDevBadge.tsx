"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminDevBadge() {
  const [activePlan, setActivePlan] = useState<"free" | "premium">("premium");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch("/api/admin/dev-mode")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setActivePlan(data.data.activePlan);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const newPlan = activePlan === "premium" ? "free" : "premium";
    setToggling(true);
    try {
      const res = await fetch("/api/admin/dev-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });
      const data = await res.json();
      if (data.success) {
        setActivePlan(newPlan);
        window.dispatchEvent(new Event("plan-changed"));
        toast.success(`Dev mode: switched to ${newPlan}`);
      } else {
        toast.error(data.message || "Failed to toggle dev mode.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setToggling(false);
    }
  };

  if (loading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-red-500/30 bg-background/95 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-red-500">DEV</span>
        <span className="text-xs text-muted-foreground">Simulating:</span>
        <span className={`text-xs font-bold ${activePlan === "premium" ? "text-ecu-gold" : "text-foreground"}`}>
          {activePlan === "premium" ? "Premium" : "Free"}
        </span>
      </div>
      <button
        onClick={toggle}
        disabled={toggling}
        className="relative w-10 h-5 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50"
        style={{ backgroundColor: activePlan === "premium" ? "var(--color-ecu-gold)" : "var(--color-border)" }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            activePlan === "premium" ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

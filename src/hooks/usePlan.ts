"use client";

import { useState, useEffect, useCallback } from "react";

interface PlanState {
  plan: "free" | "premium";
  isAdmin: boolean;
  loading: boolean;
  refetch: () => void;
}

export function usePlan(): PlanState {
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/user/plan");
      const data = await res.json();
      if (data.success) {
        setPlan(data.data.plan);
        setIsAdmin(data.data.isAdmin);
      }
    } catch (err) {
      console.error("[usePlan] Failed to fetch plan:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Listen for plan-changed events (e.g. from admin dev-mode toggle)
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("plan-changed", handler);
    return () => window.removeEventListener("plan-changed", handler);
  }, [refetch]);

  return { plan, isAdmin, loading, refetch };
}

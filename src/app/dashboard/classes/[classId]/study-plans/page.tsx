"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import SharedResourcesSection from "@/components/SharedResourcesSection";
import QuotaIndicator from "@/components/QuotaIndicator";
import ReferencePreviewModal from "@/components/ReferencePreviewModal";
import { usePlan } from "@/hooks/usePlan";
import type { StudyPlan, StudyPlanItem, Material, SourceReference } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Done",
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const TYPE_ICONS: Record<string, string> = {
  Reading: "📚",
  Practice: "✏️",
  Review: "🔍",
  Study: "📖",
};

export default function ClassStudyPlansPage() {
  const params = useParams();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const { plan: userPlan } = usePlan();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<{ remaining: number; total: number } | null>(null);

  // Material selector for AI generation
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Optimistic status update tracking
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  
  // Reference modal state
  const [activeReference, setActiveReference] = useState<SourceReference | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch(`/api/study-plans?classId=${classId}`);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.data.plans);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const loadMaterials = useCallback(async () => {
    try {
      const res = await fetch(`/api/materials?classId=${classId}`);
      if (res.ok) {
        const data = await res.json();
        const approved = (data.data?.materials ?? []).filter(
          (m: Material) => m.status === "PROCESSED" || m.status === "APPROVED"
        );
        setMaterials(approved);
      }
    } catch (e) {
      console.error(e);
    }
  }, [classId]);

  const loadInitialQuota = useCallback(async () => {
    if (userPlan !== "premium") return;
    try {
      const res = await fetch(`/api/user/plan`);
      const data = await res.json();
      if (data.success && data.data?.quotas?.studyPlan) {
        setQuota({ remaining: data.data.quotas.studyPlan.remaining, total: data.data.quotas.studyPlan.total });
      }
    } catch (err) {
      console.error("[Study Plans] Failed to load quota:", err);
    }
  }, [userPlan]);

  useEffect(() => {
    loadPlans();
    loadInitialQuota();
    if (userPlan === "premium") loadMaterials();
  }, [loadPlans, loadInitialQuota, loadMaterials, userPlan]);

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleGenerateAIPlan = async () => {
    if (!newTitle.trim()) {
      toast.warning("Please enter a title for your study plan.");
      return;
    }
    if (selectedMaterialIds.length === 0) {
      toast.warning("Select at least one material to base the plan on.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/classes/${classId}/personal-resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "study_plan",
          materialIds: selectedMaterialIds,
        }),
      });

      const data = await res.json();
      if (res.status === 403) { toast.error("Upgrade to Premium to generate AI study plans."); return; }
      if (res.status === 429) { toast.error("Daily study plan limit reached. Try again tomorrow."); return; }

      if (!data.success) { toast.error(data.message || "Failed to generate AI plan."); return; }

      // Save as a named study plan
      const items: StudyPlanItem[] = ((data.data?.content_json as { title?: string; type?: string; references?: SourceReference[] }[]) ?? []).map((item, i) => ({
        itemId: crypto.randomUUID(),
        classId,
        semester: "",
        title: item.title ?? `Task ${i + 1}`,
        type: item.type ?? "Study",
        status: "PLANNED",
        references: item.references ?? [],
      }));

      const saveRes = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, classId, items }),
      });

      if (saveRes.ok) {
        await loadPlans();
        setNewTitle("");
        setSelectedMaterialIds([]);
        setShowForm(false);
        toast.success("Study plan generated!");
        if (data.data?.remaining !== undefined) {
          setQuota({ remaining: data.data.remaining, total: data.data.total ?? 5 });
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleItemStatusChange = async (plan: StudyPlan, item: StudyPlanItem, newStatus: string) => {
    const itemKey = item.itemId!;
    setUpdatingItemId(itemKey);

    // Optimistic update
    setPlans(prev =>
      prev.map(p =>
        p.planId !== plan.planId ? p : {
          ...p,
          items: p.items.map(i => i.itemId === itemKey ? { ...i, status: newStatus as StudyPlanItem["status"] } : i),
        }
      )
    );

    try {
      const res = await fetch(`/api/study-plans/${plan.planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: itemKey, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      toast.error("Failed to save status. Please try again.");
      await loadPlans(); // revert
    } finally {
      setUpdatingItemId(null);
    }
  };

  const performDelete = async (planId: string) => {
    try {
      const res = await fetch(`/api/study-plans?id=${planId}`, { method: "DELETE" });
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.planId !== planId));
        toast.success("Study plan deleted");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete study plan");
    }
  };

  const handleDelete = (planId: string) => {
    toast("Delete this study plan?", {
      description: "This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: () => performDelete(planId),
      },
      cancel: {
        label: "Cancel",
        onClick: () => {},
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <Link href={`/dashboard/classes/${classId}`} className="text-sm font-medium text-muted-foreground hover:text-ecu-purple inline-flex items-center gap-1 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to {formattedClass} Overview
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-purple-600">
              Study Plans
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Track your progress through {formattedClass} material.
            </p>
          </div>

          {!showForm && userPlan === "premium" && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-ecu-purple hover:bg-ecu-purple/90 text-primary-foreground font-bold rounded-xl shadow-lg px-6 h-12 flex items-center gap-2 shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              New Study Plan
            </Button>
          )}
        </div>
      </div>

      {/* Shared Community Study Plan (Free for all) */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span>📋</span> Community Study Plan
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600">FREE</span>
        </h2>
        <SharedResourcesSection classId={classId} resourceType="studyPlan" />
      </div>

      {/* Premium: My Study Plans */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <span>👑</span> My Study Plans
          {userPlan !== "premium" && (
            <span className="text-xs text-muted-foreground font-normal">(Premium feature)</span>
          )}
        </h2>

        {/* Generate Form */}
        {showForm && userPlan === "premium" && (
          <form
            onSubmit={e => { e.preventDefault(); handleGenerateAIPlan(); }}
            className="bg-background rounded-2xl border border-border p-6 shadow-sm mb-6 animate-in slide-in-from-top-4 fade-in duration-300"
          >
            <h3 className="text-base font-bold mb-4">Generate AI Study Plan</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">Plan Title</label>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={`e.g. ${formattedClass} Midterm Review`}
                  required
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ecu-purple"
                />
              </div>

              {materials.length > 0 && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">
                    Select Materials <span className="text-muted-foreground font-normal">(plan is grounded in these)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-border">
                    {materials.map(m => (
                      <button
                        key={m.materialId}
                        type="button"
                        onClick={() => toggleMaterial(m.materialId)}
                        className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                          selectedMaterialIds.includes(m.materialId)
                            ? "border-ecu-purple bg-ecu-purple/10 text-foreground ring-1 ring-ecu-purple"
                            : "border-border bg-muted/20 text-foreground hover:border-ecu-purple/50"
                        }`}
                      >
                        <p className="font-medium truncate">{m.fileName}</p>
                        <p className="text-xs text-muted-foreground">{m.materialType}</p>
                      </button>
                    ))}
                  </div>
                  {selectedMaterialIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedMaterialIds.length} material(s) selected</p>
                  )}
                </div>
              )}

              {quota && <QuotaIndicator remaining={quota.remaining} total={quota.total} resourceName="AI plan generations" />}

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isGenerating || selectedMaterialIds.length === 0}
                  className="bg-linear-to-r from-ecu-purple to-purple-800 text-white font-bold px-6 border-transparent shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all disabled:opacity-50"
                >
                  {isGenerating ? "Generating..." : "✨ Generate with AI"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setSelectedMaterialIds([]); }} className="font-bold border-border">
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Plans List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ecu-purple" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4 border-4 border-background shadow-sm">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <h2 className="text-xl font-bold mb-2">No personal study plans yet</h2>
            <p className="text-muted-foreground max-w-sm mb-6 font-medium text-sm">
              {userPlan === "premium"
                ? "Generate a study plan from your class materials to start tracking your progress."
                : "Upgrade to Premium to generate personalized study plans grounded in your class materials."}
            </p>
            {userPlan === "premium" && (
              <Button onClick={() => setShowForm(true)} className="bg-ecu-purple text-white shadow-md font-bold hover:bg-ecu-purple/90">
                Generate First Plan
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => {
              const planItems = Array.isArray(plan.items) ? plan.items : [];
              const done = planItems.filter(i => i.status === "COMPLETED").length;
              const pct = planItems.length > 0 ? Math.round((done / planItems.length) * 100) : 0;

              return (
                <div key={plan.planId} className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-muted">
                    <div
                      className="h-full bg-linear-to-r from-ecu-purple to-purple-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-lg">{plan.title}</h3>
                      <button onClick={() => handleDelete(plan.planId)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 shrink-0" title="Delete plan">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{done}/{planItems.length} tasks complete · {pct}%</p>

                    {/* Toggle items */}
                    <button
                      onClick={() => setExpandedPlanId(expandedPlanId === plan.planId ? null : plan.planId)}
                      className="text-sm font-bold text-ecu-purple hover:underline flex items-center gap-1 mb-3"
                    >
                      {expandedPlanId === plan.planId ? "Hide tasks" : "Show tasks"}
                      <svg className={`w-3.5 h-3.5 transition-transform ${expandedPlanId === plan.planId ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </button>

                    {expandedPlanId === plan.planId && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {planItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No tasks in this plan.</p>
                        ) : planItems.map((item) => {
                          const icon = TYPE_ICONS[item.type ?? ""] ?? "📌";
                          const statusColor = STATUS_COLORS[item.status ?? "PLANNED"] ?? STATUS_COLORS.PLANNED;
                          const isUpdating = updatingItemId === item.itemId;

                          return (
                            <div key={item.itemId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                              <span className="text-base shrink-0">{icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
                                <div className="flex flex-col gap-1.5 mt-0.5">
                                  {item.type && <p className="text-xs text-muted-foreground">{item.type}</p>}
                                  {item.references && item.references.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {item.references.map((ref, i) => (
                                        <button
                                          key={i}
                                          onClick={() => setActiveReference(ref)}
                                          className="text-[10px] sm:text-xs font-semibold px-2 py-1 bg-ecu-purple/10 text-ecu-purple border border-ecu-purple/20 rounded-md hover:bg-ecu-purple/20 transition-colors flex items-center gap-1.5"
                                        >
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                          <span className="truncate max-w-37.5">{ref.fileName}</span>
                                          {ref.page && <span className="opacity-75">(Pg {ref.page})</span>}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <select
                                value={item.status ?? "PLANNED"}
                                disabled={isUpdating}
                                onChange={e => handleItemStatusChange(plan, item, e.target.value)}
                                className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ecu-purple shrink-0 ${statusColor} ${isUpdating ? "opacity-50" : ""}`}
                              >
                                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeReference && (
        <ReferencePreviewModal
          reference={activeReference}
          classId={classId}
          onClose={() => setActiveReference(null)}
        />
      )}
    </div>
  );
}

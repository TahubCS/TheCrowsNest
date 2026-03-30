"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { StudyPlan } from "@/types";

export default function ClassStudyPlansPage({ params: _ }: { params: Promise<{ classId: string }> }) {
  const params = useParams();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Plan Form State
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const loadPlans = async () => {
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
  };

  useEffect(() => {
    loadPlans();
  }, [classId]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDesc, classId, items: [] })
      });

      const data = await res.json();
      if (data.success) {
        await loadPlans();
        setNewTitle("");
        setNewDesc("");
        setShowForm(false);
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create plan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateAIPlan = async () => {
    if (!newTitle.trim()) {
      alert("Please enter a title for your generated plan.");
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/study-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDesc, classId })
      });

      const data = await res.json();
      if (data.success) {
        await loadPlans();
        setNewTitle("");
        setNewDesc("");
        setShowForm(false);
      } else {
        alert(data.message || "Failed to generate AI plan.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    try {
      const res = await fetch(`/api/study-plans?id=${planId}`, { method: "DELETE" });
      if (res.ok) {
        setPlans(prev => prev.filter(p => p.planId !== planId));
      }
    } catch (e) {
      console.error(e);
    }
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
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
              Study Plans
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Community-driven weekly planners for {formattedClass}. Create or follow structured study schedules.
            </p>
          </div>

          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="bg-ecu-purple hover:bg-ecu-purple/90 text-primary-foreground font-bold rounded-xl shadow-lg px-6 h-12 flex items-center gap-2 shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
              Create New Plan
            </Button>
          )}
        </div>
      </div>

      {/* Create Plan Form */}
      {showForm && (
        <form onSubmit={handleCreatePlan} className="bg-background rounded-2xl border border-border p-6 shadow-sm max-w-2xl animate-in slide-in-from-top-4 fade-in duration-300">
          <h2 className="text-xl font-bold mb-4">Create a Study Plan for {formattedClass}</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Plan Title</label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder={`e.g. ${formattedClass} Midterm Review Schedule`}
                required
                className="bg-muted/50 focus-visible:ring-ecu-purple"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Description (Optional)</label>
              <Input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="e.g. Covers chapters 1-5 for the midterm exam"
                className="bg-muted/50 focus-visible:ring-ecu-purple"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={handleGenerateAIPlan} disabled={isGenerating || isSubmitting} className="bg-gradient-to-r from-ecu-purple to-purple-800 text-white font-bold px-6 border-transparent shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all">
                {isGenerating ? "Synthesizing Canvas..." : "✨ Auto-Generate with AI"}
              </Button>
              <Button type="submit" disabled={isSubmitting || isGenerating} className="bg-muted hover:bg-muted/80 text-foreground font-bold px-6">
                {isSubmitting ? "Saving..." : "Create Empty Plan"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="font-bold border-border">
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ecu-purple"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
          <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mb-6 border-4 border-background shadow-sm">
            <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">No Study Plans for {formattedClass}</h2>
          <p className="text-muted-foreground max-w-sm mb-6 font-medium">
            Be the first to create a study plan for this class! Organize topics week by week and share with classmates.
          </p>
          <Button onClick={() => setShowForm(true)} className="bg-ecu-purple text-white shadow-md font-bold hover:bg-ecu-purple/90">
            Create First Plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => {
            const isPurple = idx % 2 === 0;
            return (
              <div key={plan.planId} className="bg-background rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full overflow-hidden group">
                <div className={`h-2 w-full bg-linear-to-r ${isPurple ? 'from-ecu-purple to-purple-400' : 'from-ecu-gold to-yellow-300'}`}></div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl group-hover:text-ecu-purple transition-colors line-clamp-1" title={plan.title}>
                      {plan.title}
                    </h3>
                    <button onClick={() => handleDelete(plan.planId)} className="text-muted-foreground hover:text-red-500 transition-colors p-1" title="Delete Plan">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">{plan.description || "No description provided."}</p>

                  {/* Expandable Items Detail */}
                  {expandedPlanId === plan.planId && plan.items && plan.items.length > 0 && (
                    <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {plan.items.map((item, itemIdx) => (
                        <div key={item.itemId || itemIdx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                            item.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {item.status === "COMPLETED" ? "✓" : item.status === "IN_PROGRESS" ? "⏳" : "○"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.title || "Untitled Task"}</p>
                            {item.type && <p className="text-xs text-muted-foreground">{item.type}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {expandedPlanId === plan.planId && (!plan.items || plan.items.length === 0) && (
                    <div className="mb-4 p-4 rounded-lg bg-muted/20 border border-dashed border-border text-center text-sm text-muted-foreground animate-in fade-in duration-200">
                      No items in this plan yet.
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-semibold bg-muted px-2.5 py-1 rounded-md text-foreground">
                      {plan.items?.length || 0} items
                    </span>
                    <button 
                      onClick={() => setExpandedPlanId(expandedPlanId === plan.planId ? null : plan.planId)}
                      className="text-sm font-bold text-ecu-purple hover:underline flex items-center gap-1"
                    >
                      {expandedPlanId === plan.planId ? "Hide details" : "View details"}
                      <svg className={`w-4 h-4 transition-transform ${expandedPlanId === plan.planId ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

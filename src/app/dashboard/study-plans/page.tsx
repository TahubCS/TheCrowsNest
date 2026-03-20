"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { StudyPlan } from "@/types";

export default function StudyPlansPage() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Plan Form State
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPlans = async () => {
    try {
      const res = await fetch("/api/study-plans");
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
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, description: newDesc, items: [] })
      });
      
      const data = await res.json();
      if (data.success) {
        // Refresh plans
        await loadPlans();
        // Reset form
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">My Study Plans</h1>
          <p className="text-muted-foreground mt-2 text-lg">Organize your academic journey and track custom degree paths.</p>
        </div>
        
        {!showForm && (
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-ecu-purple hover:bg-ecu-purple/90 text-primary-foreground font-bold rounded-xl shadow-lg px-6 h-12 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
            Create New Plan
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreatePlan} className="bg-background rounded-2xl border border-border p-6 shadow-sm max-w-2xl animate-in slide-in-from-top-4 fade-in duration-300">
          <h2 className="text-xl font-bold mb-4">Create a Study Plan</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Plan Title</label>
              <Input 
                value={newTitle} 
                onChange={e => setNewTitle(e.target.value)} 
                placeholder="e.g. Fall 2026 Core Requirements" 
                required 
                className="bg-muted/50 focus-visible:ring-ecu-purple"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Description (Optional)</label>
              <Input 
                value={newDesc} 
                onChange={e => setNewDesc(e.target.value)} 
                placeholder="e.g. Focusing on my major prerequisites" 
                className="bg-muted/50 focus-visible:ring-ecu-purple"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="bg-ecu-purple hover:bg-ecu-purple/90 font-bold px-6">
                {isSubmitting ? "Creating..." : "Save Plan"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="font-bold border-border">
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ecu-purple"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
          <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">No Study Plans Yet</h2>
          <p className="text-muted-foreground max-w-sm mb-6">Create a personalized study plan to organize your courses and track graduation requirements.</p>
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
                <div className={`h-2 w-full bg-gradient-to-r ${isPurple ? 'from-ecu-purple to-purple-400' : 'from-ecu-gold to-yellow-300'}`}></div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-xl group-hover:text-ecu-purple transition-colors line-clamp-1" title={plan.title}>
                      {plan.title}
                    </h3>
                    <button onClick={() => handleDelete(plan.planId)} className="text-muted-foreground hover:text-red-500 transition-colors p-1" title="Delete Plan">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-2 min-h-[40px]">{plan.description || "No description provided."}</p>
                  
                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-semibold bg-muted px-2.5 py-1 rounded-md text-foreground">
                      {plan.items?.length || 0} classes
                    </span>
                    <button className="text-sm font-bold text-ecu-purple hover:underline flex items-center gap-1">
                      View details <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
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

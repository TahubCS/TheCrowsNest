"use client";

import { useState, useEffect } from "react";
import ReferencePreviewModal from "@/components/ReferencePreviewModal";
import type { SourceReference } from "@/types";

interface SharedResourcesProps {
  classId: string;
  resourceType: "flashcards" | "exam" | "studyPlan";
}

interface SharedData {
  generationStatus: "idle" | "generating" | "ready";
  exam: unknown;
  studyPlan: unknown;
  flashcards: unknown;
  updatedAt?: string;
}

type StudyPlanItem = {
  itemId?: string;
  title?: string;
  type?: string;
  status?: string;
  classId?: string;
  references?: SourceReference[];
};

const STUDY_PLAN_TYPE_ICON: Record<string, string> = {
  Reading: "📚",
  Practice: "✏️",
  Review: "🔍",
  Study: "📖",
};

const STUDY_PLAN_STATUS_COLOR: Record<string, string> = {
  PLANNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

export default function SharedResourcesSection({ classId, resourceType }: SharedResourcesProps) {
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);

  // Flashcard viewer state
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Exam viewer state
  const [examIndex, setExamIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedExamAnswer, setSelectedExamAnswer] = useState<string | null>(null);

  // Study plan expand state
  const [expandedPlan, setExpandedPlan] = useState(false);
  const [activeReference, setActiveReference] = useState<SourceReference | null>(null);

  useEffect(() => {
    fetch(`/api/classes/${classId}/shared-resources`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ecu-purple" />
        Loading shared resources...
      </div>
    );
  }

  if (!data || data.generationStatus === "idle") {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-6 mb-8">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-lg">🕒</div>
          <div>
            <p className="text-sm font-semibold text-foreground">Shared resources are not ready yet.</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              They are auto-generated after enough approved, high-context materials are processed for this class.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (data.generationStatus === "generating") {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-ecu-gold" />
          <div>
            <p className="text-sm font-semibold text-foreground">Shared resources are being generated...</p>
            <p className="text-xs text-muted-foreground mt-0.5">This happens automatically when new materials are uploaded. Check back soon.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Flashcards viewer ──
  if (resourceType === "flashcards") {
    const cards = data.flashcards;
    if (!cards || !Array.isArray(cards) || cards.length === 0) return null;

    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📗</span>
            <h3 className="text-sm font-bold text-foreground">Community Flashcards</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">FREE</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Card {cardIndex + 1} of {cards.length}
          </span>
        </div>

        <div
          className="relative w-full min-h-40 cursor-pointer group mb-4"
          style={{ perspective: "1000px" }}
          onClick={() => setFlipped(!flipped)}
        >
          <div
            className="relative w-full min-h-40 transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div className="absolute inset-0 bg-background border border-border rounded-xl flex items-center justify-center p-6 text-center" style={{ backfaceVisibility: "hidden" }}>
              <p className="text-lg font-semibold text-foreground">{cards[cardIndex].front}</p>
              <span className="absolute bottom-3 right-4 text-xs text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">Click to flip</span>
            </div>
            <div className="absolute inset-0 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-center p-6 text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <p className="text-base text-foreground">{cards[cardIndex].back}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setFlipped(false); setCardIndex((i) => (i - 1 + cards.length) % cards.length); }}
            className="flex-1 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => { setFlipped(false); setCardIndex((i) => (i + 1) % cards.length); }}
            className="flex-1 py-2 text-sm font-semibold rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 hover:bg-green-500/20 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // ── Exam viewer ──
  if (resourceType === "exam") {
    const questions = Array.isArray(data.exam)
      ? data.exam
      : (typeof data.exam === "object" && data.exam !== null && Array.isArray((data.exam as { questions?: unknown[] }).questions)
          ? (data.exam as { questions: unknown[] }).questions
          : null);
    if (!questions || !Array.isArray(questions) || questions.length === 0) return null;

    const q = questions[examIndex] as { question?: string; text?: string; options?: string[]; correctAnswer?: string | number; explanation?: string };
    const correctAnswerText = typeof q.correctAnswer === "number" ? q.options?.[q.correctAnswer] : q.correctAnswer;

    const handleSelectExamOption = (opt: string) => {
      setSelectedExamAnswer(opt);
    };

    return (
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <h3 className="text-sm font-bold text-foreground">Community Practice Exam</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600">FREE</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Q{examIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="bg-background border border-border rounded-xl p-5 mb-4">
          <p className="font-semibold text-foreground mb-3">{q.question || q.text || "Question"}</p>
          {q.options && Array.isArray(q.options) && (
            <div className="space-y-2">
              {q.options.map((opt: string, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectExamOption(opt)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    selectedExamAnswer === opt
                      ? "border-purple-500 bg-purple-500/10 text-foreground ring-1 ring-purple-500"
                      : "border-border bg-muted/20 text-foreground hover:border-purple-400 hover:bg-purple-500/5"
                  } ${showAnswer && opt === correctAnswerText ? "border-green-500 bg-green-500/10 text-green-700" : ""}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          {selectedExamAnswer && !showAnswer && (
            <p className="mt-3 text-xs text-muted-foreground">
              Selected: <span className="font-semibold text-foreground">{selectedExamAnswer}</span>
            </p>
          )}
          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="mt-3 text-xs font-bold text-purple-600 hover:underline"
            >
              Show Answer
            </button>
          ) : (
            <p className="mt-3 text-xs text-green-600 font-semibold">
              Answer: {correctAnswerText}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setShowAnswer(false); setSelectedExamAnswer(null); setExamIndex((i) => Math.max(0, i - 1)); }}
            disabled={examIndex === 0}
            className="flex-1 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => { setShowAnswer(false); setSelectedExamAnswer(null); setExamIndex((i) => Math.min(questions.length - 1, i + 1)); }}
            disabled={examIndex === questions.length - 1}
            className="flex-1 py-2 text-sm font-semibold rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-700 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  // ── Study Plan viewer ──
  if (resourceType === "studyPlan") {
    const items = Array.isArray(data.studyPlan) ? (data.studyPlan as StudyPlanItem[]) : [];
    if (items.length === 0) return null;

    return (
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h3 className="text-sm font-bold text-foreground">Community Study Plan</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600">FREE</span>
            <span className="text-xs text-muted-foreground">{items.length} topics</span>
          </div>
          <button
            onClick={() => setExpandedPlan(!expandedPlan)}
            className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
          >
            {expandedPlan ? "Collapse" : "Show all"}
            <svg className={`w-3 h-3 transition-transform ${expandedPlan ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        <div className={`space-y-2 ${!expandedPlan ? "max-h-52 overflow-hidden relative" : ""}`}>
          {items.map((item, i) => {
            const icon = STUDY_PLAN_TYPE_ICON[item.type ?? ""] ?? "📌";
            const statusColor = STUDY_PLAN_STATUS_COLOR[item.status ?? "PLANNED"] ?? STUDY_PLAN_STATUS_COLOR.PLANNED;
            return (
              <div key={item.itemId ?? i} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                <span className="text-base shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
                  <div className="flex flex-col gap-1.5 mt-0.5">
                    {item.type && <p className="text-xs text-muted-foreground mt-0.5">{item.type}</p>}
                    {item.references && item.references.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {item.references.map((ref, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveReference(ref)}
                            className="text-[10px] font-semibold px-2 py-1 bg-purple-500/10 text-purple-700 border border-purple-500/20 rounded-md hover:bg-purple-500/20 transition-colors flex items-center gap-1.5"
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
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                  {item.status ?? "PLANNED"}
                </span>
              </div>
            );
          })}
          {!expandedPlan && items.length > 3 && (
            <div className="absolute bottom-0 inset-x-0 h-16 bg-linear-to-t from-purple-500/5 to-transparent pointer-events-none" />
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

  return null;
}

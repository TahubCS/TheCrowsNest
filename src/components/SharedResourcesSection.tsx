"use client";

import { useState, useEffect } from "react";

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
  title?: string;
  topic?: string;
  name?: string;
  description?: string;
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

  // Study plan expand state
  const [expandedPlan, setExpandedPlan] = useState(false);

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
          className="relative w-full min-h-40 cursor-pointer perspective-1000 group mb-4"
          onClick={() => setFlipped(!flipped)}
        >
          <div className={`relative w-full min-h-40 transition-transform duration-500 transform-style-3d ${flipped ? "rotate-y-180" : ""}`}>
            <div className="absolute inset-0 backface-hidden bg-background border border-border rounded-xl flex items-center justify-center p-6 text-center">
              <p className="text-lg font-semibold text-foreground">{cards[cardIndex].front}</p>
              <span className="absolute bottom-3 right-4 text-xs text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">Click to flip</span>
            </div>
            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-center p-6 text-center">
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
                <div
                  key={i}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    showAnswer && (typeof q.correctAnswer === "number" ? i === q.correctAnswer : opt === q.correctAnswer)
                      ? "border-green-500 bg-green-500/10 text-green-700"
                      : "border-border bg-muted/20 text-foreground"
                  }`}
                >
                  {opt}
                </div>
              ))}
            </div>
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
              Answer: {typeof q.correctAnswer === "number" ? q.options?.[q.correctAnswer] : q.correctAnswer}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setShowAnswer(false); setExamIndex((i) => Math.max(0, i - 1)); }}
            disabled={examIndex === 0}
            className="flex-1 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => { setShowAnswer(false); setExamIndex((i) => Math.min(questions.length - 1, i + 1)); }}
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
    const plan = data.studyPlan;
    if (!plan) return null;

    const structuredPlan = !Array.isArray(plan) && typeof plan === "object" && plan !== null
      ? (plan as { items?: unknown[]; topics?: unknown[] })
      : null;
    const items = Array.isArray(plan) ? plan : structuredPlan?.items || structuredPlan?.topics || [];
    if (items.length === 0) return null;

    return (
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h3 className="text-sm font-bold text-foreground">Community Study Plan</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600">FREE</span>
          </div>
          <button
            onClick={() => setExpandedPlan(!expandedPlan)}
            className="text-xs font-bold text-purple-600 hover:underline"
          >
            {expandedPlan ? "Collapse" : "Expand"}
          </button>
        </div>

        <div className={`space-y-2 ${!expandedPlan ? "max-h-48 overflow-hidden relative" : ""}`}>
          {items.map((item: unknown, i: number) => {
            const planItem = typeof item === "object" && item !== null ? (item as StudyPlanItem) : null;
            return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border">
              <span className="text-xs font-bold text-muted-foreground mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {typeof item === "string" ? item : planItem?.title || planItem?.topic || planItem?.name || JSON.stringify(item)}
                </p>
                {planItem?.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{planItem.description}</p>
                )}
              </div>
            </div>
          );
          })}
          {!expandedPlan && items.length > 3 && (
            <div className="absolute bottom-0 inset-x-0 h-16 bg-linear-to-t from-purple-500/5 to-transparent pointer-events-none" />
          )}
        </div>
      </div>
    );
  }

  return null;
}

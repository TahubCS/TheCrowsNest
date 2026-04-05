"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import SharedResourcesSection from "@/components/SharedResourcesSection";
import UpgradePrompt from "@/components/UpgradePrompt";
import QuotaIndicator from "@/components/QuotaIndicator";
import MaterialSelectionModal from "@/components/MaterialSelectionModal";
import { usePlan } from "@/hooks/usePlan";

interface MaterialOption {
  materialId: string;
  fileName: string;
  materialType?: string;
  status?: string;
}

interface PersonalResourceRow {
  resource_type?: string;
  content_json?: unknown;
  contentJson?: unknown;
  created_at?: string;
  createdAt?: string;
}

interface UIQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

function normalizeExamQuestions(input: unknown): UIQuestion[] {
  const source = Array.isArray((input as { questions?: unknown[] })?.questions)
    ? (input as { questions: unknown[] }).questions
    : Array.isArray((input as { practiceExam?: { questions?: unknown[] } })?.practiceExam?.questions)
      ? (input as { practiceExam: { questions: unknown[] } }).practiceExam.questions
      : Array.isArray(input)
        ? input
        : [];

  return source
    .map((q, idx) => {
      if (!q || typeof q !== "object") return null;
      const row = q as { question?: string; text?: string; options?: unknown[]; correctAnswer?: unknown };
      const options = Array.isArray(row.options)
        ? row.options.map((opt) => String(opt))
        : [];
      const prompt = row.question || row.text || `Question ${idx + 1}`;

      let answerText = "";
      if (typeof row.correctAnswer === "number") {
        answerText = options[row.correctAnswer] ?? "";
      } else if (typeof row.correctAnswer === "string") {
        answerText = row.correctAnswer;
      }

      if (!prompt || options.length === 0 || !answerText) return null;

      return {
        question: prompt,
        options,
        correctAnswer: answerText,
      };
    })
    .filter((q): q is UIQuestion => q !== null);
}

export default function PracticeExamsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const { plan, loading: planLoading } = usePlan();
  const [isGenerating, setIsGenerating] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; total: number } | null>(null);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  // Exam state
  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Load initial quota on page load (Premium users only)
  const loadInitialQuota = useCallback(async () => {
    if (plan !== "premium") return;
    try {
      const res = await fetch(`/api/user/plan`);
      const data = await res.json();
      if (data.success && data.data?.quotas?.exam) {
        setQuota({ remaining: data.data.quotas.exam.remaining, total: data.data.quotas.exam.total });
      }
    } catch (err) {
      console.error("[Practice Exams] Failed to load quota:", err);
    }
  }, [plan]);

  useEffect(() => {
    loadInitialQuota();
  }, [loadInitialQuota, plan]);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const res = await fetch(`/api/materials?classId=${classId}`);
        const data = await res.json();
        if (data.success) {
          const approved = (data.data?.materials || []).filter((m: MaterialOption) => m.status === "PROCESSED");
          setMaterials(approved);
        }
      } catch (err) {
        console.error("[Practice Exams] Failed to load materials:", err);
      }
    }

    if (classId && plan === "premium") {
      loadMaterials();
    }
  }, [classId, plan]);

  useEffect(() => {
    async function loadLatestPersonalExam() {
      try {
        const res = await fetch(`/api/classes/${classId}/personal-resources`);
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) return;

        const latestExam = (data.data as PersonalResourceRow[]).find((row) => row.resource_type === "exam");
        if (!latestExam) return;

        const content = latestExam.content_json ?? latestExam.contentJson;
        const normalized = normalizeExamQuestions(content);
        if (normalized.length > 0) {
          setQuestions(normalized);
          setCurrentIndex(0);
          setSelectedAnswers({});
          setShowResults(false);
          setIsReviewing(false);
        }
      } catch (err) {
        console.error("[Practice Exams] Failed to load personal exam:", err);
      }
    }

    if (classId && plan === "premium") {
      loadLatestPersonalExam();
    }
  }, [classId, plan]);

  const handleToggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleGeneratePersonal = async () => {
    if (selectedMaterialIds.length === 0) {
      toast.error("Select at least one material.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/classes/${classId}/personal-resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceType: "exam",
          materialIds: selectedMaterialIds,
        }),
      });
      const data = await res.json();

      if (res.status === 403) {
        toast.error("Upgrade to Premium to generate personal exams.");
        return;
      }
      if (res.status === 429) {
        toast.error(data.message || "Daily exam limit reached. Try again tomorrow!");
        return;
      }
      if (!data.success) {
        toast.error(data.message || "Failed to generate personal exam.");
        return;
      }

      const content = data.data?.content_json ?? data.data?.contentJson ?? data.data;
      const generatedQuestions = normalizeExamQuestions(content);

      if (generatedQuestions.length === 0) {
        toast.error("Generation completed but no questions were returned.");
        return;
      }

      setQuestions(generatedQuestions);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setShowResults(false);
      setIsReviewing(false);
      setSelectedMaterialIds([]);
      setShowMaterialModal(false);
      toast.success("Personal practice exam generated.");

      await loadInitialQuota();
    } catch (err) {
      console.error(err);
      toast.error("Network error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (opt: string) => {
    if (showResults || isReviewing) return;
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: opt }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctAnswer) score++;
    });
    return Math.round((score / questions.length) * 100);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <Link href={`/dashboard/classes/${classId}`} className="text-sm font-medium text-muted-foreground hover:text-ecu-purple inline-flex items-center gap-1 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to {formattedClass} Overview
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-ecu-gold">
              Practice Exams
            </h1>
            <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
              Test your knowledge with AI-generated practice exams tailored to your actual course materials.
            </p>
          </div>
        </div>
      </div>

      {/* Shared Community Exam (Free for all) */}
      <SharedResourcesSection classId={classId} resourceType="exam" />

      {/* Quota Indicator */}
      {quota && <QuotaIndicator remaining={quota.remaining} total={quota.total} resourceName="exam generations" />}

      {/* Main Area */}
      {planLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ecu-purple" />
        </div>
      ) : plan === "free" && questions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-muted/10 p-6">
          <h2 className="text-lg font-bold text-foreground">Personal Practice Exam Generation</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Free users can use community practice exams above. Premium unlocks personal exams generated from selected materials.
          </p>
          <div className="mt-4">
            <UpgradePrompt featureName="generate personal practice exams from selected materials" />
          </div>
        </div>
      ) : questions.length === 0 ? (
        <div className="relative group overflow-hidden rounded-3xl p-1 pointer-events-none">
          {/* Animated Glow Border */}
          <div className="absolute inset-0 bg-linear-to-r from-purple-500 via-ecu-gold to-purple-500 opacity-30 group-hover:opacity-60 blur-xl transition-opacity duration-500 rounded-3xl animate-pulse"></div>
          
          <div className="relative bg-background/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl pointer-events-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6 text-ecu-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  New Assessment
                </h2>
                <p className="text-muted-foreground text-sm mt-1">Configure your practice environment</p>
              </div>
              {/* Visual purely decorative badge */}
              <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wide">
                AI Powered
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Premium personal exams are generated from specific approved class materials.
              </p>

              <button 
                onClick={() => setShowMaterialModal(true)}
                disabled={isGenerating}
                className="w-full relative overflow-hidden mt-4 bg-linear-to-r from-ecu-purple to-purple-800 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Generating Personal Exam...
                  </span>
                ) : (
                  "Select Materials & Generate"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : showResults ? (
        <div className="bg-background border border-border rounded-3xl p-8 shadow-xl text-center">
          <h2 className="text-3xl font-bold mb-2">Exam Results</h2>
          <div className="text-6xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-ecu-purple to-purple-500 my-6">
            {calculateScore()}%
          </div>
          <p className="text-muted-foreground mb-8 text-lg">
            You got {Object.keys(selectedAnswers).filter(i => selectedAnswers[Number(i)] === questions[Number(i)].correctAnswer).length} out of {questions.length} correct.
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setQuestions([])} className="px-6 py-3 bg-muted hover:bg-muted/80 font-bold rounded-xl transition-colors">Start New Exam</button>
            <button onClick={() => { setShowResults(false); setIsReviewing(true); setCurrentIndex(0); }} className="px-6 py-3 bg-ecu-purple text-white hover:bg-purple-800 font-bold rounded-xl transition-colors shadow-lg">Review Answers</button>
          </div>
        </div>
      ) : (
        <div className="bg-background border border-border rounded-3xl p-8 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-muted-foreground">
              {isReviewing ? "REVIEWING" : "QUESTION"} {currentIndex + 1} OF {questions.length}
            </span>
            <button onClick={() => { setQuestions([]); setIsReviewing(false); }} className="text-sm text-red-500 font-bold hover:underline">{isReviewing ? "Done" : "Quit"}</button>
          </div>
          
          <h3 className="text-2xl font-semibold mb-8 text-foreground leading-relaxed">{questions[currentIndex].question}</h3>
          
          <div className="space-y-3 mb-8">
            {questions[currentIndex].options.map((opt, i) => {
              const isSelected = selectedAnswers[currentIndex] === opt;
              const isCorrect = questions[currentIndex].correctAnswer === opt;
              
              let styleClass = "bg-muted/30 border-border hover:border-ecu-purple hover:bg-purple-500/5";
              if (isReviewing) {
                // Review mode: green for correct, red for incorrect selections
                if (isCorrect) {
                  styleClass = "border-green-500 bg-green-500/10 ring-1 ring-green-500";
                } else if (isSelected && !isCorrect) {
                  styleClass = "border-red-500 bg-red-500/10 ring-1 ring-red-500";
                } else {
                  styleClass = "bg-muted/20 border-border/50 opacity-60";
                }
              } else if (isSelected) {
                styleClass = "border-ecu-purple bg-purple-500/10 ring-1 ring-ecu-purple";
              }

              return (
                <button 
                  key={i} 
                  onClick={() => handleSelectOption(opt)}
                  disabled={isReviewing}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-foreground ${styleClass} ${isReviewing ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {isReviewing && isCorrect && <span className="text-green-600 font-bold text-sm">✓ Correct</span>}
                    {isReviewing && isSelected && !isCorrect && <span className="text-red-500 font-bold text-sm">✕ Wrong</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center border-t border-border pt-6">
            <button 
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-6 py-2.5 rounded-lg border border-border font-bold hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>
            
            {currentIndex === questions.length - 1 ? (
              <button 
                onClick={() => setShowResults(true)}
                disabled={Object.keys(selectedAnswers).length < questions.length}
                className="px-6 py-2.5 rounded-lg bg-ecu-purple text-white font-bold hover:bg-purple-800 disabled:opacity-50"
              >
                Submit Exam
              </button>
            ) : (
              <button 
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-6 py-2.5 rounded-lg bg-ecu-purple text-white font-bold hover:bg-purple-800"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}

      <MaterialSelectionModal
        open={showMaterialModal}
        title="Generate Personal Practice Exam"
        subtitle="Select approved materials to include in your personal exam."
        materials={materials}
        selectedIds={selectedMaterialIds}
        submitting={isGenerating}
        onToggle={handleToggleMaterial}
        onClose={() => {
          if (!isGenerating) setShowMaterialModal(false);
        }}
        onSubmit={handleGeneratePersonal}
      />
    </div>
  );
}

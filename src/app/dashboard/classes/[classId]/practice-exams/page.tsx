"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import MaterialSelectionModal from "@/components/MaterialSelectionModal";
import QuotaIndicator from "@/components/QuotaIndicator";
import UpgradePrompt from "@/components/UpgradePrompt";
import { usePlan } from "@/hooks/usePlan";

interface MaterialOption {
  materialId: string;
  fileName: string;
  materialType?: string;
  status?: string;
}

interface ExamSessionRecord {
  id: string;
  exam_scope: "shared" | "personal";
  resource_type: "exam";
  suggested_question_count: number;
  question_count: number;
  difficulty: string;
  material_ids?: string[] | null;
  content_json?: unknown;
  created_at?: string;
  updated_at?: string;
  generation_status?: string;
}

interface UIQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

interface SessionsBundle {
  sharedSession: ExamSessionRecord | null;
  personalSessions: ExamSessionRecord[];
}

function normalizeExamQuestions(input: unknown): UIQuestion[] {
  const source = Array.isArray((input as { questions?: unknown[] })?.questions)
    ? (input as { questions: unknown[] }).questions
    : Array.isArray((input as { practiceExam?: { questions?: unknown[] } })?.practiceExam?.questions)
      ? (input as { practiceExam: { questions: unknown[] } }).practiceExam.questions
      : Array.isArray(input)
        ? input
        : [];

  return source.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const row = entry as {
      question?: string;
      text?: string;
      options?: unknown[];
      correctAnswer?: unknown;
      explanation?: unknown;
    };

    const options = Array.isArray(row.options) ? row.options.map((option) => String(option)) : [];
    const prompt = row.question || row.text || `Question ${index + 1}`;

    let answerText = "";
    if (typeof row.correctAnswer === "number") {
      answerText = options[row.correctAnswer] ?? "";
    } else if (typeof row.correctAnswer === "string") {
      answerText = row.correctAnswer;
    }

    if (!prompt || options.length === 0 || !answerText) {
      return [];
    }

    return [{
      question: prompt,
      options,
      correctAnswer: answerText,
      explanation: typeof row.explanation === "string" ? row.explanation : undefined,
    }];
  });
}

function formatSessionLabel(session: ExamSessionRecord) {
  const createdAt = session.created_at ? new Date(session.created_at).toLocaleString() : "Recently";
  const scope = session.exam_scope === "shared" ? "Shared" : "Personal";
  return `${scope} exam, ${session.question_count} questions, ${createdAt}`;
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
  const [questionCount, setQuestionCount] = useState(15);
  const [difficulty, setDifficulty] = useState("Medium");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionsBundle>({
    sharedSession: null,
    personalSessions: [],
  });
  const [activeSession, setActiveSession] = useState<ExamSessionRecord | null>(null);
  const [questions, setQuestions] = useState<UIQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const loadExamSessions = useCallback(async () => {
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/exam-sessions`);
      const data = await res.json();
      if (data.success) {
        setSessions({
          sharedSession: data.data?.sharedSession ?? null,
          personalSessions: Array.isArray(data.data?.personalSessions) ? data.data.personalSessions : [],
        });
      }
    } catch (error) {
      console.error("[Practice Exams] Failed to load exam sessions:", error);
    } finally {
      setSessionLoading(false);
    }
  }, [classId]);

  const loadInitialQuota = useCallback(async () => {
    if (plan !== "premium") {
      return;
    }

    try {
      const res = await fetch("/api/user/plan");
      const data = await res.json();
      if (data.success && data.data?.quotas?.exam) {
        setQuota({
          remaining: data.data.quotas.exam.remaining,
          total: data.data.quotas.exam.total,
        });
      }
    } catch (error) {
      console.error("[Practice Exams] Failed to load quota:", error);
    }
  }, [plan]);

  useEffect(() => {
    loadInitialQuota();
  }, [loadInitialQuota]);

  useEffect(() => {
    if (classId) {
      loadExamSessions();
    }
  }, [classId, loadExamSessions]);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const res = await fetch(`/api/materials?classId=${classId}`);
        const data = await res.json();
        if (data.success) {
          const approved = (data.data?.materials || []).filter((material: MaterialOption) => material.status === "PROCESSED");
          setMaterials(approved);
        }
      } catch (error) {
        console.error("[Practice Exams] Failed to load materials:", error);
      }
    }

    if (classId && plan === "premium") {
      loadMaterials();
    }
  }, [classId, plan]);

  const launchSession = (session: ExamSessionRecord) => {
    const normalized = normalizeExamQuestions(session.content_json);
    if (normalized.length === 0) {
      toast.error("This exam session has no questions.");
      return;
    }

    setActiveSession(session);
    setQuestions(normalized);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setIsReviewing(false);
  };

  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(materialId) ? prev.filter((id) => id !== materialId) : [...prev, materialId]
    );
  };

  const handleGeneratePersonal = async () => {
    if (selectedMaterialIds.length === 0) {
      toast.error("Select at least one material.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch(`/api/classes/${classId}/exam-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialIds: selectedMaterialIds,
          questionCount,
          difficulty,
          topic: "General",
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

      const generatedSession: ExamSessionRecord | null = data.data?.session ?? null;
      const generatedContent = data.data?.practiceExam ?? generatedSession?.content_json ?? null;
      const generatedQuestions = normalizeExamQuestions(generatedContent);

      if (generatedQuestions.length === 0) {
        toast.error("Generation completed but no questions were returned.");
        return;
      }

      if (generatedSession) {
        setSessions((prev) => ({
          sharedSession: prev.sharedSession,
          personalSessions: [generatedSession, ...prev.personalSessions.filter((session) => session.id !== generatedSession.id)],
        }));
        launchSession(generatedSession);
      } else {
        setQuestions(generatedQuestions);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setShowResults(false);
        setIsReviewing(false);
      }

      setSelectedMaterialIds([]);
      setShowMaterialModal(false);
      toast.success("Personal practice exam generated.");

      await loadInitialQuota();
      await loadExamSessions();
    } catch (error) {
      console.error(error);
      toast.error("Network error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateScore = () => {
    if (questions.length === 0) {
      return 0;
    }

    let score = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score += 1;
      }
    });
    return Math.round((score / questions.length) * 100);
  };

  const currentQuestion = questions[currentIndex];
  const correctAnswers = questions.filter((question, index) => selectedAnswers[index] === question.correctAnswer).length;

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
              Launch shared sessions or generate and save personal exams from approved class materials.
            </p>
          </div>
        </div>
      </div>

      {activeSession ? (
        <div className="rounded-3xl border border-border bg-background p-6 shadow-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {activeSession.exam_scope === "shared" ? "Shared session" : "Personal session"}
              </p>
              <h2 className="text-2xl font-bold mt-1">
                {activeSession.exam_scope === "shared" ? "Community Practice Exam" : "Saved Personal Exam"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {formatSessionLabel(activeSession)}
              </p>
            </div>
            <button
              onClick={() => {
                setActiveSession(null);
                setQuestions([]);
                setCurrentIndex(0);
                setSelectedAnswers({});
                setShowResults(false);
                setIsReviewing(false);
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted/50"
            >
              Back to sessions
            </button>
          </div>

          {showResults ? (
            <div className="text-center py-6">
              <h3 className="text-3xl font-bold mb-2">Exam Results</h3>
              <div className="text-6xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-ecu-purple to-purple-500 my-6">
                {calculateScore()}%
              </div>
              <p className="text-muted-foreground mb-8 text-lg">
                You got {correctAnswers} out of {questions.length} correct.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={() => {
                    setActiveSession(null);
                    setQuestions([]);
                    setCurrentIndex(0);
                    setSelectedAnswers({});
                    setShowResults(false);
                    setIsReviewing(false);
                  }}
                  className="px-6 py-3 bg-muted hover:bg-muted/80 font-bold rounded-xl transition-colors"
                >
                  Start New Exam
                </button>
                <button
                  onClick={() => {
                    setShowResults(false);
                    setIsReviewing(true);
                    setCurrentIndex(0);
                  }}
                  className="px-6 py-3 bg-ecu-purple text-white hover:bg-purple-800 font-bold rounded-xl transition-colors shadow-lg"
                >
                  Review Answers
                </button>
              </div>
            </div>
          ) : questions.length > 0 ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-bold text-muted-foreground">
                  {isReviewing ? "REVIEWING" : "QUESTION"} {currentIndex + 1} OF {questions.length}
                </span>
                <button
                  onClick={() => {
                    setActiveSession(null);
                    setQuestions([]);
                    setCurrentIndex(0);
                    setSelectedAnswers({});
                    setShowResults(false);
                    setIsReviewing(false);
                  }}
                  className="text-sm text-red-500 font-bold hover:underline"
                >
                  {isReviewing ? "Done" : "Quit"}
                </button>
              </div>

              <h3 className="text-2xl font-semibold mb-8 text-foreground leading-relaxed">
                {currentQuestion.question}
              </h3>

              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswers[currentIndex] === option;
                  const isCorrect = currentQuestion.correctAnswer === option;

                  let styleClass = "bg-muted/30 border-border hover:border-ecu-purple hover:bg-purple-500/5";
                  if (isReviewing) {
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
                      key={index}
                      onClick={() => {
                        if (showResults || isReviewing) {
                          return;
                        }
                        setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: option }));
                      }}
                      disabled={isReviewing}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium text-foreground ${styleClass} ${isReviewing ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{option}</span>
                        {isReviewing && isCorrect && <span className="text-green-600 font-bold text-sm">Correct</span>}
                        {isReviewing && isSelected && !isCorrect && <span className="text-red-500 font-bold text-sm">Wrong</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center border-t border-border pt-6">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
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
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="px-6 py-2.5 rounded-lg bg-ecu-purple text-white font-bold hover:bg-purple-800"
                  >
                    Next
                  </button>
                )}
              </div>

              {isReviewing && currentQuestion.explanation && (
                <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Explanation: </span>
                  {currentQuestion.explanation}
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="h-fit rounded-3xl border border-border bg-background p-6 shadow-xl self-start">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Shared session</p>
                  <h2 className="text-2xl font-bold mt-1">Community Practice Exam</h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">FREE</span>
              </div>

              {sessionLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ecu-purple" />
                  Loading exam sessions...
                </div>
              ) : sessions.sharedSession ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Launch the latest shared exam built from class materials.
                  </p>
                  <button
                    onClick={() => launchSession(sessions.sharedSession as ExamSessionRecord)}
                    className="w-full rounded-xl bg-ecu-purple px-4 py-3 text-white font-bold hover:bg-purple-800 transition-colors"
                  >
                    Launch Shared Exam
                  </button>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {sessions.sharedSession.question_count} questions, shared to the whole class.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Shared exam sessions are generated automatically once enough approved class materials are available.
                </p>
              )}
            </div>

            <div className="h-fit rounded-3xl border border-border bg-background p-6 shadow-xl self-start">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Personal exams</p>
                  <h2 className="text-2xl font-bold mt-1">Saved Premium Sessions</h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600">PREMIUM</span>
              </div>

              {plan === "premium" ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a new exam from approved materials and keep it in your history.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 mb-4">
                    <label className="space-y-2 text-sm font-medium text-foreground">
                      <span>Question count</span>
                      <input
                        type="number"
                        min={5}
                        max={30}
                        value={questionCount}
                        onChange={(event) => setQuestionCount(Number(event.target.value))}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-foreground">
                      <span>Difficulty</span>
                      <select
                        value={difficulty}
                        onChange={(event) => setDifficulty(event.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      >
                        <option>Easy</option>
                        <option>Medium</option>
                        <option>Hard</option>
                      </select>
                    </label>
                  </div>
                  <button
                    onClick={() => setShowMaterialModal(true)}
                    disabled={isGenerating}
                    className="w-full rounded-xl bg-linear-to-r from-ecu-purple to-purple-800 px-4 py-3 text-white font-bold hover:opacity-95 disabled:opacity-70"
                  >
                    {isGenerating ? "Generating Personal Exam..." : "Select Materials & Generate"}
                  </button>

                  <div className="mt-5 space-y-3">
                    {sessions.personalSessions.length > 0 ? sessions.personalSessions.map((session) => (
                      <div key={session.id} className="relative group">
                        <button
                          onClick={() => launchSession(session)}
                          className="w-full rounded-2xl border border-border bg-muted/20 px-4 py-3 text-left hover:border-ecu-purple hover:bg-purple-500/5 transition-colors pr-14"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">Saved exam</p>
                              <p className="text-xs text-muted-foreground mt-1">{formatSessionLabel(session)}</p>
                            </div>
                            <span className="text-xs font-bold text-purple-600">Open</span>
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toast("Delete this personal exam?", {
                              description: "This action cannot be undone.",
                              action: {
                                label: "Delete",
                                onClick: async () => {
                                  try {
                                    const res = await fetch(`/api/classes/${classId}/exam-sessions?id=${session.id}`, { method: "DELETE" });
                                    if (res.ok) {
                                      setSessions(prev => ({
                                        ...prev,
                                        personalSessions: prev.personalSessions.filter(s => s.id !== session.id)
                                      }));
                                      toast.success("Exam deleted.");
                                    } else {
                                      toast.error("Failed to delete exam.");
                                    }
                                  } catch (error) {
                                    toast.error("Network error.");
                                  }
                                }
                              },
                              cancel: { label: "Cancel", onClick: () => { } }
                            });
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete exam"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">No saved personal exams yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Premium unlocks personal exam generation, saved history, and custom question counts.
                  </p>
                  <div className="mt-4">
                    <UpgradePrompt featureName="generate personal practice exams from selected materials" />
                  </div>
                </>
              )}
            </div>
          </div>

          {planLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ecu-purple" />
            </div>
          ) : null}

          {quota && <QuotaIndicator remaining={quota.remaining} total={quota.total} resourceName="exam generations" />}
        </>
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
          if (!isGenerating) {
            setShowMaterialModal(false);
          }
        }}
        onSubmit={handleGeneratePersonal}
      />
    </div>
  );
}

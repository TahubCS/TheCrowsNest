"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function PracticeExamsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("All Course Topics");
  const [difficulty, setDifficulty] = useState("Standard");
  const [format, setFormat] = useState("Short Quiz");

  // Exam state
  const [questions, setQuestions] = useState<{question: string; options: string[]; correctAnswer: string}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/practice-exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, topic: selectedTopic, difficulty, format })
      });
      const data = await res.json();
      if (data.success && data.data?.questions?.length > 0) {
        setQuestions(data.data.questions);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setShowResults(false);
      } else {
        toast.error(data.message || "Failed to generate exam.");
      }
    } catch (e) {
      console.error(e);
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

      {/* Main Area */}
      {questions.length === 0 ? (
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
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Focus Topic</label>
                <select 
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl p-3 text-foreground focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="All Course Topics">All Course Topics</option>
                  <option value="Midterm 1 Review">Midterm 1 Review</option>
                  <option value="Recent Material">Recent Material</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Difficulty</label>
                  <div className="flex bg-muted/50 rounded-xl p-1 border border-border">
                    <button onClick={() => setDifficulty("Standard")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${difficulty === "Standard" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Standard</button>
                    <button onClick={() => setDifficulty("Hard")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${difficulty === "Hard" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Hard</button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Length</label>
                  <div className="flex bg-muted/50 rounded-xl p-1 border border-border">
                    <button onClick={() => setFormat("Short Quiz")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${format === "Short Quiz" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>5 Qs</button>
                    <button onClick={() => setFormat("Full Exam")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${format === "Full Exam" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>10 Qs</button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full relative overflow-hidden mt-4 bg-linear-to-r from-ecu-purple to-purple-800 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Generating Exam...
                  </span>
                ) : (
                  "Generate Practice Exam"
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
    </div>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function FlashcardsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const [isGenerating, setIsGenerating] = useState(false);
  const [focusUnit, setFocusUnit] = useState("Everything Discussed So Far");
  const [cardCount, setCardCount] = useState(20);
  const [style, setStyle] = useState("Concepts");

  // Deck state
  const [flashcards, setFlashcards] = useState<{front: string; back: string}[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, topic: focusUnit, count: cardCount, style })
      });
      const data = await res.json();
      if (data.success && data.data?.flashcards?.length > 0) {
        setFlashcards(data.data.flashcards);
        setCurrentIndex(0);
        setIsFlipped(false);
      } else {
        toast.error(data.message || "Failed to generate flashcards.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150); // slight delay to allow flip back animation
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 150);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <Link href={`/dashboard/classes/${classId}`} className="text-sm font-medium text-muted-foreground hover:text-green-500 inline-flex items-center gap-1 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to {formattedClass} Overview
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-green-400 to-emerald-600">
              Flashcard Studio
            </h1>
            <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
              Master {formattedClass} concepts instantly with AI-generated smart flashcard decks based on your uploaded materials.
            </p>
          </div>
        </div>
      </div>

      {/* Main Area */}
      {flashcards.length === 0 ? (
        <div className="relative group overflow-hidden rounded-3xl p-1 pointer-events-none">
          {/* Animated Glow Border */}
          <div className="absolute inset-0 bg-linear-to-r from-green-500 via-emerald-400 to-teal-500 opacity-20 group-hover:opacity-40 blur-xl transition-opacity duration-500 rounded-3xl animate-pulse"></div>
          
          <div className="relative bg-background/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl pointer-events-auto min-h-100 flex flex-col justify-center">
            
            <div className="text-center max-w-lg mx-auto mb-10">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-foreground to-muted-foreground">Generate New Deck</h2>
              <p className="text-muted-foreground mt-3">Select a focus area and let our AI synthesize your class notes, lectures, and syllabus into bite-sized study cards.</p>
            </div>

            <div className="space-y-6 max-w-md mx-auto w-full">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Target Material</label>
                <select 
                  value={focusUnit}
                  onChange={(e) => setFocusUnit(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-xl p-4 text-foreground focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="Everything Discussed So Far">Everything Discussed So Far</option>
                  <option value="Recent Lectures">Recent Lectures</option>
                  <option value="Midterm Review">Midterm Review</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Card Count</label>
                  <div className="flex bg-muted/30 rounded-xl p-1 border border-border">
                    <button onClick={() => setCardCount(20)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${cardCount === 20 ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>20 Cards</button>
                    <button onClick={() => setCardCount(40)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${cardCount === 40 ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>40 Cards</button>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Style</label>
                  <div className="flex bg-muted/30 rounded-xl p-1 border border-border">
                    <button onClick={() => setStyle("Concepts")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${style === "Concepts" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Concepts</button>
                    <button onClick={() => setStyle("Vocab")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${style === "Vocab" ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Vocab</button>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full relative overflow-hidden mt-6 bg-linear-to-r from-green-500 to-emerald-600 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                     <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                    Extracting Concepts...
                  </span>
                ) : (
                  "Build Flashcards"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="flex justify-between w-full mb-6 items-center px-4">
            <span className="text-sm font-bold text-muted-foreground">CARD {currentIndex + 1} OF {flashcards.length}</span>
            <button onClick={() => setFlashcards([])} className="text-sm text-muted-foreground hover:text-red-500 font-semibold transition-colors">Start Over</button>
          </div>
          
          {/* 3D Card Container */}
          <div 
            className="w-full aspect-4/3 md:aspect-video perspective-1000 cursor-pointer group"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
              
              {/* Front side */}
              <div className="absolute inset-0 backface-hidden bg-background border border-border rounded-3xl shadow-xl flex items-center justify-center p-8 md:p-12 text-center overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-green-400 to-emerald-500"></div>
                <h3 className="text-2xl md:text-4xl font-bold leading-tight text-foreground">{flashcards[currentIndex].front}</h3>
                <div className="absolute bottom-6 right-8 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">Click to flip ⤵</div>
              </div>

              {/* Back side */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-green-500/5 border border-green-500/20 rounded-3xl shadow-xl flex items-center justify-center p-8 md:p-12 text-center">
                <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-teal-400 to-green-500"></div>
                <p className="text-xl md:text-3xl font-medium leading-relaxed text-foreground">{flashcards[currentIndex].back}</p>
                <div className="absolute bottom-6 left-8 text-green-500/50 opacity-0 group-hover:opacity-100 transition-opacity">⤴ Click to unflip</div>
              </div>

            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-4 mt-8 w-full">
            <button onClick={prevCard} className="flex-1 py-4 bg-background border border-border rounded-xl font-bold hover:bg-muted/50 transition-colors shadow-sm flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              Previous
            </button>
            <button onClick={nextCard} className="flex-1 py-4 bg-linear-to-r from-green-500 to-emerald-500 text-white border-transparent rounded-xl font-bold hover:shadow-lg hover:shadow-green-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

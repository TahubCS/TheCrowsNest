"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function FlashcardsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const [isGenerating, setIsGenerating] = useState(false);
  const [focusUnit, setFocusUnit] = useState("Unit 1: Fundamentals");

  // Requested: no mock data
  const decks: any[] = [];

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <Link href={`/dashboard/classes/${classId}`} className="text-sm font-medium text-muted-foreground hover:text-green-500 inline-flex items-center gap-1 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to {formattedClass} Overview
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
              Flashcard Studio
            </h1>
            <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
              Master {formattedClass} concepts instantly with AI-generated smart flashcard decks based on your uploaded materials.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Generator Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className="relative group overflow-hidden rounded-3xl p-1 pointer-events-none">
            {/* Animated Glow Border */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-400 to-teal-500 opacity-20 group-hover:opacity-40 blur-xl transition-opacity duration-500 rounded-3xl animate-pulse"></div>
            
            <div className="relative bg-background/80 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl pointer-events-auto min-h-[400px] flex flex-col justify-center">
              
              <div className="text-center max-w-lg mx-auto mb-10">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">Generate New Deck</h2>
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
                    <option>Everything Discussed So Far</option>
                    <option>Unit 1: Introduction & Fundamentals</option>
                    <option>Unit 3: Object-Oriented Design</option>
                    <option>Midterm Exam Review Notes</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold">Card Count</label>
                    <div className="flex bg-muted/30 rounded-xl p-1 border border-border">
                      <button className="flex-1 py-2 text-sm font-medium rounded-lg bg-background shadow-sm text-foreground">20 Cards</button>
                      <button className="flex-1 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">40 Cards</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold">Style</label>
                    <div className="flex bg-muted/30 rounded-xl p-1 border border-border">
                      <button className="flex-1 py-2 text-sm font-medium rounded-lg bg-background shadow-sm text-foreground">Concepts</button>
                      <button className="flex-1 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">Vocab</button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full relative overflow-hidden mt-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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
        </div>

        {/* Sidebar - My Decks */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-background rounded-3xl border border-border p-6 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">My Library</h3>
              <span className="text-xs font-bold px-2 py-1 bg-muted text-muted-foreground rounded-md">0 DECKS</span>
            </div>
            
            {decks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 opacity-70">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-border rotate-12 transition-transform hover:rotate-0">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <p className="font-bold text-foreground">Library is Empty</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Decks you generate will appear here. Build your first deck to get started studying.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto">
                {/* Dynamically mapped decks go here */}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Cards Mastered:</span>
              <span className="font-bold">0</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

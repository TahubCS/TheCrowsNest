"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function PracticeExamsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("All Topics");

  const handleGenerate = () => {
    setIsGenerating(true);
    // Logic for generating an exam will go here
    setTimeout(() => setIsGenerating(false), 2000); // Temporary visual feedback
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
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-ecu-gold">
              Practice Exams
            </h1>
            <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
              Test your knowledge with AI-generated practice exams tailored to your actual course materials.
            </p>
          </div>
        </div>
      </div>

      {/* Main Action Area - Generate New Exam */}
      <div className="relative group overflow-hidden rounded-3xl p-1 pointer-events-none">
        {/* Animated Glow Border */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-ecu-gold to-purple-500 opacity-30 group-hover:opacity-60 blur-xl transition-opacity duration-500 rounded-3xl animate-pulse"></div>
        
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
                <option>All Course Topics</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm font-semibold">Difficulty</label>
                <div className="flex bg-muted/50 rounded-xl p-1 border border-border">
                  <button className="flex-1 py-2 text-sm font-medium rounded-lg bg-background shadow-sm text-foreground">Standard</button>
                  <button className="flex-1 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">Hard</button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold">Format</label>
                <div className="flex bg-muted/50 rounded-xl p-1 border border-border">
                  <button className="flex-1 py-2 text-sm font-medium rounded-lg bg-background shadow-sm text-foreground">Multiple Choice</button>
                  <button className="flex-1 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors">Mixed</button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full relative overflow-hidden mt-4 bg-gradient-to-r from-ecu-purple to-purple-800 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
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
    </div>
  );
}

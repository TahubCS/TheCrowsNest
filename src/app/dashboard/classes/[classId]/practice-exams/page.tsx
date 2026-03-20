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

  // As requested, no mock data
  const pastExams: any[] = [];

  const handleGenerate = () => {
    setIsGenerating(true);
    // Logic for generating an exam will go here
    setTimeout(() => setIsGenerating(false), 2000); // Temporary visual feedback
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
              Test your knowledge with AI-generated practice exams tailored to your actual course timeline and materials.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Action Area - Generate New Exam */}
        <div className="lg:col-span-2 space-y-6">
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
                    <option>Unit 1: Introduction & Fundamentals</option>
                    <option>Unit 2: Advanced Data Structures</option>
                    <option>Midterm Review</option>
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

        {/* Sidebar - Stats & History */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-background rounded-3xl border border-border p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Your Progress</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-2xl p-4 text-center border border-border/50">
                <p className="text-3xl font-extrabold text-foreground mb-1">0</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Exams Taken</p>
              </div>
              <div className="bg-muted/30 rounded-2xl p-4 text-center border border-border/50">
                <p className="text-3xl font-extrabold text-foreground mb-1">--%</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg Score</p>
              </div>
            </div>
          </div>

          {/* Past Exams List / Empty State */}
          <div className="bg-background rounded-3xl border border-border p-6 shadow-sm flex flex-col h-[calc(100%-12rem)] min-h-[300px]">
            <h3 className="font-bold text-lg mb-4">Previous Exams</h3>
            
            {pastExams.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 opacity-70">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-border">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <p className="font-bold text-foreground">No History Yet</p>
                <p className="text-sm text-muted-foreground mt-1">Generate your first practice exam to start tracking your performance.</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto">
                {/* Real data would map here */}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

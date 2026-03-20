"use client";

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

const MOCK_MATERIALS = [
  { id: 1, name: "_Syllabus_Fall.pdf", type: "Syllabus", uploader: { name: "Professor", initial: "P", color: "bg-ecu-gold", text: "text-ecu-purple" }, updated: "2 days ago", icon: "text-red-600 bg-red-100" },
  { id: 2, name: "Chapter_1_Introduction.pptx", type: "Lecture Slides", uploader: { name: "Jacob (Student)", initial: "J", color: "bg-muted", text: "text-foreground" }, updated: "1 week ago", icon: "text-blue-600 bg-blue-100" },
  { id: 3, name: "Midterm_1_Review.docx", type: "Study Guide", uploader: { name: "Alex (Student)", initial: "A", color: "bg-ecu-purple", text: "text-white" }, updated: "3 weeks ago", icon: "text-green-600 bg-green-100" }
];

export default function ClassOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { update } = useSession();
  const classId = params.classId as string;
  const formattedClass = classId?.toUpperCase() || "CLASS";

  const [showConfirm, setShowConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleRemoveClass = async () => {
    setIsRemoving(true);
    try {
      const res = await fetch("/api/classes/enroll", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const data = await res.json();
      if (data.success) {
        await update();
        // Full navigation to bypass SSR cache and show updated classes
        window.location.href = "/dashboard";
      } else {
        alert(`Failed to remove class: ${data.message}`);
        setShowConfirm(false);
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong.");
      setShowConfirm(false);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-ecu-purple inline-flex items-center gap-1 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{formattedClass}</h1>
          <p className="text-muted-foreground mt-2 text-lg">Class overview and study materials.</p>
        </div>

        {/* Remove Class Button */}
        <div className="relative shrink-0 mt-8">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm font-medium text-muted-foreground hover:text-red-500 border border-border hover:border-red-500/50 px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Remove Class
            </button>
          ) : (
            <div className="bg-background border border-red-500/30 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 min-w-[260px]">
              <p className="text-sm font-bold text-foreground mb-1">Remove {formattedClass}?</p>
              <p className="text-xs text-muted-foreground mb-4">This will unenroll you from the class. You can re-enroll later.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleRemoveClass}
                  disabled={isRemoving}
                  className="flex-1 text-sm font-bold bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isRemoving ? "Removing..." : "Yes, Remove"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 text-sm font-bold border border-border py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <Link href={`/dashboard/classes/${classId}/study-plans`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl sm:text-8xl">📝</span>
          </div>
          <h3 className="font-bold text-xl sm:text-2xl group-hover:text-purple-400 transition-colors mb-2">Study Plans</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">Community-driven weekly planners for {formattedClass}.</p>
        </Link>

        <Link href={`/dashboard/classes/${classId}/practice-exams`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl sm:text-8xl">🎯</span>
          </div>
          <h3 className="font-bold text-xl sm:text-2xl group-hover:text-ecu-gold transition-colors mb-2">Practice Exams</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">Past exams and quizzes submitted by old students.</p>
        </Link>

        <Link href={`/dashboard/classes/${classId}/flashcards`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl sm:text-8xl">🗂️</span>
          </div>
          <h3 className="font-bold text-xl sm:text-2xl group-hover:text-green-400 transition-colors mb-2">Flashcards</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">Quick memorization decks tailored to your focus units.</p>
        </Link>

        <Link href={`/dashboard/classes/${classId}/ai-tutor`} className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="text-6xl sm:text-8xl">🤖</span>
          </div>
          <h3 className="font-bold text-xl sm:text-2xl group-hover:text-blue-400 transition-colors mb-2">AI Study Tutor</h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">Get instant, step-by-step guidance on {formattedClass} topics.</p>
        </Link>
      </div>

      {/* Uploaded Course Materials */}
      <div className="mt-16 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Course Materials</h2>
          <button className="text-sm bg-ecu-purple/10 text-ecu-purple hover:bg-ecu-purple/20 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Upload File
          </button>
        </div>

        <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
          {MOCK_MATERIALS.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-5 border-4 border-background shadow-sm">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="font-extrabold text-xl mb-2 text-foreground">No Materials Available</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Be the first to upload the syllabus, study guides, or your lecture notes to help train the AI for this class!
              </p>
              <button className="text-sm bg-ecu-purple text-primary-foreground hover:bg-ecu-purple/90 px-8 py-3 rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                Upload First File
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-6 md:col-span-5">File Name</div>
                <div className="col-span-3 md:col-span-2 hidden md:block">Type</div>
                <div className="col-span-4 md:col-span-3">Uploaded By</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              <div className="divide-y divide-border">
                {MOCK_MATERIALS.map((file) => (
                  <div key={file.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group">
                    <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${file.icon}`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /></svg>
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium text-foreground truncate">{file.id === 1 ? formattedClass : ''}{file.name}</p>
                        <p className="text-xs text-muted-foreground">Updated {file.updated}</p>
                      </div>
                    </div>
                    <div className="col-span-3 md:col-span-2 hidden md:block text-sm text-foreground">{file.type}</div>
                    <div className="col-span-4 md:col-span-3 text-sm flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${file.uploader.color} ${file.uploader.text}`}>{file.uploader.initial}</div>
                      <span className="truncate">{file.uploader.name}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <button className="text-ecu-purple hover:underline text-sm font-medium cursor-pointer">View</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          *These materials are processed by our AI to automatically generate personalized flashcards and exams for you.
        </p>
      </div>
    </div>
  );
}

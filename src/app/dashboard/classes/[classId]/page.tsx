"use client"

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Material {
  materialId: string;
  fileName: string;
  fileType: string;
  materialType: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  status: string;
  s3Key: string;
  rejectionReason?: string;
}

// Mock materials for the Onboarding 101 demo class
const MOCK_MATERIALS: Material[] = [
  { materialId: "m1", fileName: "ONBD101_Syllabus_Fall2026.pdf", fileType: "application/pdf", materialType: "Syllabus", uploadedBy: "alex@students.ecu.edu", uploadedByName: "Alex M.", uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: "PROCESSED", s3Key: "" },
  { materialId: "m2", fileName: "Week1_Lecture_Slides.pptx", fileType: "application/vnd.ms-powerpoint", materialType: "Lecture Slides", uploadedBy: "jordan@students.ecu.edu", uploadedByName: "Jordan T.", uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(), status: "PROCESSED", s3Key: "" },
  { materialId: "m3", fileName: "Study_Guide_Chapter1-3.pdf", fileType: "application/pdf", materialType: "Study Guide", uploadedBy: "riley@students.ecu.edu", uploadedByName: "Riley C.", uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(), status: "PROCESSED", s3Key: "" },
  { materialId: "m4", fileName: "Midterm_Exam_2025.pdf", fileType: "application/pdf", materialType: "Past Exam", uploadedBy: "sam@students.ecu.edu", uploadedByName: "Sam W.", uploadedAt: new Date(Date.now() - 86400000 * 1).toISOString(), status: "PROCESSED", s3Key: "" },
  { materialId: "m5", fileName: "My_Lecture_Notes_Week2.pdf", fileType: "application/pdf", materialType: "Notes", uploadedBy: "morgan@students.ecu.edu", uploadedByName: "Morgan L.", uploadedAt: new Date().toISOString(), status: "PENDING_REVIEW", s3Key: "" },
];

export default function ClassOverviewPage({ params }: { params: { classId: string } }) {
  const { data: session } = useSession();
  const [classId, setClassId] = useState<string>("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const submitReport = async (type: "USER" | "DOCUMENT", targetId: string, targetName: string) => {
    const reason = prompt(`Why are you reporting this ${type === "USER" ? "user" : "document"}?`);
    if (!reason || reason.trim() === "") return;
    setReportSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId, targetName, classId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("✅ Report submitted. An admin will review it shortly.");
      } else {
        toast.error("Failed to submit report: " + data.message);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setOpenUserMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    Promise.resolve(params).then((p) => {
      setClassId(p.classId);
      loadMaterials(p.classId);
    });
  }, [params]);

  const loadMaterials = async (cid: string) => {
    // Demo class: load static mock data instead of hitting the API
    if (cid === "onboarding101") {
      setMaterials(MOCK_MATERIALS);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/materials?classId=${cid}`);
      const data = await res.json();
      if (data.success) {
        const allMats = data.data.materials || [];
        // Show only PROCESSED materials + user's own uploads (any status)
        const userEmail = session?.user?.email;
        const filtered = allMats.filter((m: Material) =>
          m.status === "PROCESSED" || m.uploadedBy === userEmail
        );
        setMaterials(filtered);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
        router.push("/dashboard");
      } else {
        toast.error(data.message || "Failed to remove class.");
        setIsRemoving(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove class.");
      setIsRemoving(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const typeInput = form.elements.namedItem("materialType") as HTMLSelectElement;

    const file = fileInput.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL
      const presignRes = await fetch("/api/materials/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          classId,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignData.success) {
        toast.error(presignData.message);
        setUploading(false);
        return;
      }

      const { presignedUrl, s3Key, materialId } = presignData.data;

      // Step 2: Upload to S3
      setUploadProgress(50);
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        toast.error("Upload to S3 failed.");
        setUploading(false);
        return;
      }

      setUploadProgress(75);

      // Step 3: Save metadata
      const metaRes = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId,
          classId,
          fileName: file.name,
          fileType: file.type,
          s3Key,
          materialType: typeInput.value,
        }),
      });

      const metaData = await metaRes.json();
      if (metaData.success) {
        setUploadProgress(100);
        setShowUploadModal(false);
        loadMaterials(classId);
        form.reset();
      } else {
        toast.error(metaData.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDismissRejected = async (materialId: string, s3Key: string) => {
    try {
      const res = await fetch(`/api/materials?classId=${classId}&materialId=${materialId}&s3Key=${encodeURIComponent(s3Key)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMaterials((prev) => prev.filter((m) => m.materialId !== materialId));
      } else {
        toast.error(data.message || "Failed to dismiss.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to dismiss.");
    }
  };

  const formattedClass = classId.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-ecu-purple inline-flex items-center gap-1 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{formattedClass}</h1>
            <div className="flex gap-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-muted/50 text-muted-foreground border border-border shadow-xs group cursor-default">
                <span className="mr-1.5 opacity-70 group-hover:scale-110 transition-transform">📊</span>
                <span>{materials.length} Community Files</span>
              </div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-linear-to-r from-ecu-gold/20 to-ecu-gold/10 text-ecu-gold border border-ecu-gold/30 shadow-xs group cursor-default">
                <span className="mr-1.5 group-hover:animate-pulse">✨</span>
                <span>9.2 Context Rating</span>
              </div>
            </div>
          </div>
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

      <div id="tour-study-tools" className="grid gap-6 md:grid-cols-2 mt-8">
        <StudyToolCard
          title="Study Plans"
          desc={`Community-driven weekly planners for ${formattedClass}.`}
          icon="📝"
          hoverColor="group-hover:text-purple-400"
          href={`/dashboard/classes/${classId}/study-plans`}
          classId={classId}
        />
        <StudyToolCard
          title="Practice Exams"
          desc="Past exams and quizzes submitted by old students."
          icon="🎯"
          hoverColor="group-hover:text-ecu-gold"
          href={`/dashboard/classes/${classId}/practice-exams`}
          classId={classId}
        />
        <StudyToolCard
          title="Flashcards"
          desc="Quick memorization decks tailored to your focus units."
          icon="🗂️"
          hoverColor="group-hover:text-green-400"
          href={`/dashboard/classes/${classId}/flashcards`}
          classId={classId}
        />
        <StudyToolCard
          title="AI Study Tutor"
          desc={`Get instant, step-by-step guidance on ${formattedClass} topics.`}
          icon="🤖"
          hoverColor="group-hover:text-blue-400"
          href={`/dashboard/classes/${classId}/ai-tutor`}
          classId={classId}
        />
      </div>

      {/* Course Materials */}
      <div className="mt-16 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Course Materials</h2>
          <button id="tour-upload-btn" onClick={() => setShowUploadModal(true)} className="text-sm bg-ecu-purple/10 text-ecu-purple hover:bg-ecu-purple/20 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Upload File
          </button>
        </div>

        <div className="bg-background rounded-2xl border border-border overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ecu-purple"></div>
            </div>
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-5 border-4 border-background shadow-sm">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="font-extrabold text-xl mb-2 text-foreground">No Materials Available</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                Be the first to upload the syllabus, study guides, or your lecture notes to help train the AI for this class!
              </p>
              <button onClick={() => setShowUploadModal(true)} className="text-sm bg-ecu-purple text-primary-foreground hover:bg-ecu-purple/90 px-8 py-3 rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5">
                Upload First File
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-6 md:col-span-5">File Name</div>
                <div className="col-span-3 md:col-span-2 hidden md:block">Type</div>
                <div className="col-span-4 md:col-span-3">Uploaded By</div>
                <div className="col-span-2 text-right">Status</div>
              </div>

              <div className="divide-y divide-border">
                {materials.map((file, idx) => {
                  const icon = file.fileType.includes("pdf") ? "text-red-600 bg-red-100" : file.fileType.includes("presentation") ? "text-blue-600 bg-blue-100" : "text-green-600 bg-green-100";
                  const initial = file.uploadedByName.charAt(0).toUpperCase();
                  const timeAgo = new Date(file.uploadedAt).toLocaleDateString();

                  return (
                    <div key={file.materialId} id={idx === 0 ? "tour-material-row" : undefined} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group">
                      <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${icon}`}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" /></svg>
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium text-foreground truncate">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                      </div>
                      <div className="col-span-3 md:col-span-2 hidden md:block text-sm text-foreground">{file.materialType}</div>
                      {/* Uploader — click for context menu */}
                      <div className="col-span-4 md:col-span-3 text-sm relative" ref={openUserMenu === file.materialId ? userMenuRef : null}>
                        <button
                          onClick={() => setOpenUserMenu(openUserMenu === file.materialId ? null : file.materialId)}
                          className="flex items-center gap-2 hover:text-ecu-purple transition-colors cursor-pointer rounded-lg px-1 py-0.5 hover:bg-muted/60"
                        >
                          <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold bg-muted text-foreground">{initial}</div>
                          <span className="truncate">{file.uploadedByName}</span>
                          <svg className="w-3 h-3 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {openUserMenu === file.materialId && (
                          <div className="absolute left-0 top-full mt-1 z-20 bg-background border border-border rounded-xl shadow-xl overflow-hidden w-44 animate-in fade-in slide-in-from-top-2 duration-150">
                            <button
                              onClick={() => { setOpenUserMenu(null); toast.info(`View profile for ${file.uploadedByName} — coming soon!`); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors text-left cursor-pointer"
                            >
                              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              View Profile
                            </button>
                            <button
                              onClick={() => { setOpenUserMenu(null); submitReport("USER", file.uploadedByName, file.uploadedByName); }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-red-50 text-red-500 transition-colors text-left cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                              Report User
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Status + Report document button */}
                      <div className="col-span-2 text-right flex items-center justify-end gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-md font-semibold ${
                            file.status === "PROCESSED" ? "bg-green-100 text-green-700" :
                            file.status === "PROCESSING" ? "bg-blue-100 text-blue-700 animate-pulse" :
                            file.status === "REJECTED" ? "bg-red-100 text-red-700" :
                            file.status === "FAILED" ? "bg-red-100 text-red-700" :
                            file.status === "APPROVED" ? "bg-green-50 text-green-600" :
                            "bg-yellow-100 text-yellow-700"
                          }`}
                          title={file.status === "REJECTED" && file.rejectionReason ? `Reason: ${file.rejectionReason}` : undefined}
                        >
                          {file.status === "PENDING_REVIEW" ? "Awaiting Review" :
                           file.status === "PROCESSING" ? "Processing..." :
                           file.status}
                        </span>
                        {file.status === "REJECTED" && (
                          <button
                            title="Dismiss & Remove from View"
                            onClick={() => handleDismissRejected(file.materialId, file.s3Key)}
                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700 rounded-md px-2 py-1 text-xs font-bold transition-colors shadow-sm ml-1"
                          >
                            Dismiss
                          </button>
                        )}
                        <button
                          title="Report this document"
                          onClick={() => submitReport("DOCUMENT", file.materialId, file.fileName)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H12.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          *These materials are processed by our AI to automatically generate personalized flashcards and exams for you.
        </p>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-2xl border border-border p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">Upload Material</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">File</label>
                <input type="file" name="file" accept=".pdf,.pptx,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp" required className="w-full text-sm border border-border rounded-lg p-2 bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Material Type</label>
                <select name="materialType" required className="w-full text-sm border border-border rounded-lg p-2 bg-background">
                  <option value="Syllabus">Syllabus</option>
                  <option value="Lecture Slides">Lecture Slides</option>
                  <option value="Study Guide">Study Guide</option>
                  <option value="Past Exam">Past Exam</option>
                  <option value="Notes">Notes</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {uploading && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-ecu-purple h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowUploadModal(false)} disabled={uploading} className="flex-1 px-4 py-2 border border-border rounded-lg font-semibold hover:bg-muted transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="flex-1 px-4 py-2 bg-ecu-purple text-white rounded-lg font-semibold hover:bg-ecu-purple/90 transition-colors disabled:opacity-50">
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StudyToolCard({ title, desc, icon, hoverColor, href, classId }: { title: string, desc: string, icon: string, hoverColor: string, href: string, classId: string }) {
  const handleClick = (e: React.MouseEvent) => {
    if (classId === 'onboarding101') {
      e.preventDefault();
      toast.info("This is a demo class. These tools are available in real classes once you upload materials!");
    }
  };

  return (
    <Link 
      href={href} 
      onClick={handleClick}
      className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-[160px]"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-6xl sm:text-8xl">
        {icon}
      </div>
      <h3 className={`font-bold text-xl sm:text-2xl ${hoverColor} transition-colors mb-2`}>{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">{desc}</p>
    </Link>
  );
}

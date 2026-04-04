"use client"

import { useState, useEffect, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
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
  storageKey: string;
  rejectionReason?: string;
  rejectionCode?: string;
  aiConfidence?: number;
}

const REASON_MESSAGES: Record<string, string> = {
  unsupported_type: "This file type is not supported.",
  mime_extension_mismatch: "File extension does not match file type.",
  file_too_large: "File is too large. Max is 20 MB.",
  magic_bytes_mismatch: "Could not verify file format.",
  invalid_filename: "File name is invalid.",
  duplicate_content: "Similar material was already uploaded recently.",
  unreadable_file: "File could not be read.",
  encrypted_file: "Encrypted files are not supported.",
  excessive_pages: "File is very large and needs admin review.",
  empty_or_low_text: "Not enough readable text found.",
  garbled_text: "Extracted text appears corrupted.",
  low_ocr_content: "Not enough readable text found in image.",
  irrelevant_material: "File appears unrelated to this class.",
  low_relevance_confidence: "AI review found low relevance to class.",
  uncertain_relevance: "Uploaded and routed to admin review.",
  approved: "Material approved and processed.",
  excessive_chunks: "File is too large for auto embedding.",
  embedding_failed: "Processing failed, please retry later.",
  rate_limited: "Too many uploads. Try again shortly.",
  suspicious_upload_pattern: "Uploads require manual review.",
};

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Mock materials for the Onboarding 101 demo class
const MOCK_MATERIALS: Material[] = [
  { materialId: "m1", fileName: "ONBD101_Syllabus_Fall2026.pdf", fileType: "application/pdf", materialType: "Syllabus", uploadedBy: "alex@students.ecu.edu", uploadedByName: "Alex M.", uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: "PROCESSED", storageKey: "" },
  { materialId: "m2", fileName: "Week1_Lecture_Slides.pptx", fileType: "application/vnd.ms-powerpoint", materialType: "Lecture Slides", uploadedBy: "jordan@students.ecu.edu", uploadedByName: "Jordan T.", uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(), status: "PROCESSED", storageKey: "" },
  { materialId: "m3", fileName: "Study_Guide_Chapter1-3.pdf", fileType: "application/pdf", materialType: "Study Guide", uploadedBy: "riley@students.ecu.edu", uploadedByName: "Riley C.", uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(), status: "PROCESSED", storageKey: "" },
  { materialId: "m4", fileName: "Midterm_Exam_2025.pdf", fileType: "application/pdf", materialType: "Past Exam", uploadedBy: "sam@students.ecu.edu", uploadedByName: "Sam W.", uploadedAt: new Date(Date.now() - 86400000 * 1).toISOString(), status: "PROCESSED", storageKey: "" },
  { materialId: "m5", fileName: "My_Lecture_Notes_Week2.pdf", fileType: "application/pdf", materialType: "Notes", uploadedBy: "morgan@students.ecu.edu", uploadedByName: "Morgan L.", uploadedAt: new Date().toISOString(), status: "PENDING_REVIEW", storageKey: "" },
];

export default function ClassOverviewPage({ params }: { params: { classId: string } }) {
  const { data: session } = useSession();
  const [classId, setClassId] = useState<string>("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const submitReport = async (type: "USER" | "DOCUMENT", targetId: string, targetName: string) => {
    const reason = prompt(`Why are you reporting this ${type === "USER" ? "user" : "document"}?`);
    if (!reason || reason.trim() === "") return;
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
    }
  };

  const loadMaterials = useCallback(async (cid: string) => {
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
  }, [session?.user?.email]);

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
  }, [params, loadMaterials]);

  const calculateMetrics = () => {
    const processedMaterials = materials.filter(m => m.status === "PROCESSED");
    const count = processedMaterials.length;
    
    let rating = 0;
    processedMaterials.forEach(m => {
      if (m.materialType === "Syllabus") rating += 3.5;
      else if (m.materialType === "Study Guide") rating += 1.5;
      else if (m.materialType === "Lecture Slides") rating += 0.7;
      else if (m.materialType === "Past Exam" || m.materialType === "Notes") rating += 0.5;
      else rating += 0.2;
    });

    return {
      communityFilesCount: count,
      contextRating: Math.min(10, rating).toFixed(1)
    };
  };

  const { communityFilesCount, contextRating } = calculateMetrics();

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

  const handleFileSelection = (file: File | null) => {
    setSelectedFile(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    if (!file) return;

    const input = document.getElementById("material-file-input") as HTMLInputElement | null;
    if (input && e.dataTransfer.files.length > 0) {
      input.files = e.dataTransfer.files;
    }
    handleFileSelection(file);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const typeInput = form.elements.namedItem("materialType") as HTMLSelectElement;

    const file = selectedFile ?? fileInput.files?.[0];
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

      const { presignedUrl, storageKey, materialId, fileExtension } = presignData.data;

      // Step 1b: Compute content hash for duplicate detection
      const contentHash = await computeFileHash(file);

      // Step 2: Upload to Supabase Storage
      setUploadProgress(50);
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        toast.error("Upload failed.");
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
          storageKey,
          materialType: typeInput.value,
          fileSize: file.size,
          fileExtension,
          contentHash,
        }),
      });

      const metaData = await metaRes.json();
      if (metaData.success) {
        setUploadProgress(100);
        setShowUploadModal(false);
        loadMaterials(classId);
        form.reset();
        setSelectedFile(null);
      } else {
        toast.error(metaData.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setIsDragActive(false);
    }
  };

  const handleDismissRejected = async (materialId: string, storageKey: string) => {
    try {
      const res = await fetch(`/api/materials?classId=${classId}&materialId=${materialId}&storageKey=${encodeURIComponent(storageKey)}`, {
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
                <span>{communityFilesCount} Community Files</span>
              </div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-linear-to-r from-ecu-gold/20 to-ecu-gold/10 text-ecu-gold border border-ecu-gold/30 shadow-xs group cursor-default">
                <span className="mr-1.5 group-hover:animate-pulse">✨</span>
                <span>{contextRating} Context Rating</span>
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
            <div className="bg-background border border-red-500/30 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 min-w-65">
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
      <div className="mt-16 space-y-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Course Materials</h2>
          <button
            id="tour-upload-btn"
            onClick={() => {
              setSelectedFile(null);
              setShowUploadModal(true);
            }}
            className="group cursor-pointer text-sm bg-linear-to-r from-ecu-purple/15 via-ecu-purple/10 to-ecu-gold/10 text-ecu-purple hover:from-ecu-purple hover:to-ecu-purple/90 hover:text-white px-3.5 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 border border-ecu-purple/20 hover:border-ecu-purple/50 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-ecu-purple transition-all duration-300 group-hover:bg-white/20 group-hover:text-white">
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </span>
            <span>Upload File</span>
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
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setShowUploadModal(true);
                }}
                className="group cursor-pointer text-sm bg-linear-to-r from-ecu-purple to-ecu-purple/90 text-primary-foreground hover:from-ecu-purple/95 hover:to-ecu-gold hover:text-slate-950 px-8 py-3 rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:rotate-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" /></svg>
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
                             {file.uploadedBy !== session?.user?.email && (
                              <button
                                onClick={() => { setOpenUserMenu(null); submitReport("USER", file.uploadedByName, file.uploadedByName); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-red-50 text-red-500 transition-colors text-left cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                Report User
                              </button>
                            )}
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
                          title={
                            (file.status === "REJECTED" || file.status === "FAILED")
                              ? (file.rejectionCode ? REASON_MESSAGES[file.rejectionCode] : file.rejectionReason) || undefined
                              : undefined
                          }
                        >
                          {file.status === "PENDING_REVIEW" ? "Awaiting Review" :
                           file.status === "PROCESSING" ? "Processing..." :
                           file.status}
                        </span>
                        {(file.status === "REJECTED" || file.status === "FAILED") && (file.rejectionCode || file.rejectionReason) && (
                          <span className="text-[10px] text-red-500 font-medium max-w-35 truncate hidden md:inline" title={file.rejectionCode ? REASON_MESSAGES[file.rejectionCode] : file.rejectionReason}>
                            {file.rejectionCode ? REASON_MESSAGES[file.rejectionCode] : file.rejectionReason}
                          </span>
                        )}
                        {file.status === "REJECTED" && (
                          <button
                            title="Dismiss & Remove from View"
                            onClick={() => handleDismissRejected(file.materialId, file.storageKey)}
                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700 rounded-md px-2 py-1 text-xs font-bold transition-colors shadow-sm ml-1"
                          >
                            Dismiss
                          </button>
                        )}
                        {file.uploadedBy !== session?.user?.email && (
                          <button
                            title="Report this document"
                            onClick={() => submitReport("DOCUMENT", file.materialId, file.fileName)}
                            className="opacity-40 hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H12.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                          </button>
                        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-border/80 bg-background shadow-2xl">
            <div className="border-b border-border bg-linear-to-r from-ecu-purple/10 via-background to-ecu-gold/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ecu-purple/80">Course materials</p>
                  <h3 className="mt-1 text-2xl font-bold text-foreground">Upload Material</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share useful files for <span className="font-semibold text-foreground">{formattedClass}</span> and improve the class study experience.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setIsDragActive(false);
                  }}
                  disabled={uploading}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-5 p-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">File</label>
                <label
                  htmlFor="material-file-input"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={handleDrop}
                  className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-all duration-300 ${
                    isDragActive
                      ? "border-ecu-purple bg-ecu-purple/10 shadow-lg shadow-ecu-purple/10"
                      : selectedFile
                        ? "border-emerald-400/60 bg-emerald-500/5"
                        : "border-border bg-muted/30 hover:border-ecu-purple/50 hover:bg-ecu-purple/5"
                  }`}
                >
                  <input
                    id="material-file-input"
                    type="file"
                    name="file"
                    accept=".pdf,.pptx,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
                    required
                    onChange={handleFileInputChange}
                    className="sr-only"
                  />

                  <div
                    className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                      uploading
                        ? "bg-ecu-purple/15 text-ecu-purple"
                        : selectedFile
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-background text-ecu-purple shadow-sm"
                    }`}
                  >
                    {uploading ? (
                      <svg className="h-7 w-7 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V1C5.925 1 1 5.925 1 12h3z"></path>
                      </svg>
                    ) : selectedFile ? (
                      <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2A9 9 0 113 12a9 9 0 0118 0z" /></svg>
                    ) : (
                      <svg className="h-7 w-7 transition-transform duration-300 group-hover:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M12 11v7m0 0l-3-3m3 3l3-3" /></svg>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {selectedFile ? "File ready to upload" : "Drag and drop your file here"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : "or click to browse your device"}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      PDF, PPTX, DOCX, DOC, TXT, PNG, JPG, JPEG, WEBP
                    </p>
                  </div>

                  {selectedFile && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" /></svg>
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB selected
                    </div>
                  )}
                </label>
              </div>

              {uploading && (
                <div className="rounded-2xl border border-ecu-purple/15 bg-ecu-purple/5 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-foreground">Uploading material...</span>
                    <span className="font-semibold text-ecu-purple">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-linear-to-r from-ecu-purple to-ecu-gold transition-all" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setIsDragActive(false);
                  }}
                  disabled={uploading}
                  className="flex-1 cursor-pointer rounded-xl border border-border px-4 py-3 font-semibold text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="group flex-1 cursor-pointer rounded-xl bg-linear-to-r from-ecu-purple to-ecu-purple/90 px-4 py-3 font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:from-ecu-purple/95 hover:to-ecu-gold hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {uploading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V1C5.925 1 1 5.925 1 12h3z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : selectedFile ? (
                      <>
                        <svg className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" /></svg>
                        Upload Material
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" /></svg>
                        Select a File
                      </>
                    )}
                  </span>
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
      className="bg-background rounded-2xl border border-border p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden flex flex-col justify-center min-h-40"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-6xl sm:text-8xl">
        {icon}
      </div>
      <h3 className={`font-bold text-xl sm:text-2xl ${hoverColor} transition-colors mb-2`}>{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground max-w-[80%]">{desc}</p>
    </Link>
  );
}

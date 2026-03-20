"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Material {
  materialId: string;
  fileName: string;
  fileType: string;
  materialType: string;
  uploadedByName: string;
  uploadedAt: string;
  status: string;
  s3Key: string;
}

export default function ClassOverviewPage({ params }: { params: { classId: string } }) {
  const { data: session } = useSession();
  const [classId, setClassId] = useState<string>("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    Promise.resolve(params).then((p) => {
      setClassId(p.classId);
      loadMaterials(p.classId);
    });
  }, [params]);

  const loadMaterials = async (cid: string) => {
    try {
      const res = await fetch(`/api/materials?classId=${cid}`);
      const data = await res.json();
      if (data.success) {
        setMaterials(data.data.materials);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (materialId: string, s3Key: string) => {
    if (!confirm("Are you sure you want to delete this material? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/materials?materialId=${materialId}&classId=${classId}&s3Key=${encodeURIComponent(s3Key)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setMaterials(materials.filter(m => m.materialId !== materialId));
      } else {
        alert(data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete material.");
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
        alert(presignData.message);
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
        alert("Upload to S3 failed.");
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
        alert(metaData.message);
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formattedClass = classId.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-ecu-purple inline-flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{formattedClass}</h1>
        <p className="text-muted-foreground mt-2 text-lg">Class overview and study materials.</p>
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

      {/* Course Materials */}
      <div className="mt-16 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Course Materials</h2>
          <button onClick={() => setShowUploadModal(true)} className="text-sm bg-ecu-purple/10 text-ecu-purple hover:bg-ecu-purple/20 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
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
                {materials.map((file) => {
                  const icon = file.fileType.includes("pdf") ? "text-red-600 bg-red-100" : file.fileType.includes("presentation") ? "text-blue-600 bg-blue-100" : "text-green-600 bg-green-100";
                  const initial = file.uploadedByName.charAt(0).toUpperCase();
                  const timeAgo = new Date(file.uploadedAt).toLocaleDateString();

                  return (
                    <div key={file.materialId} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors group">
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
                      <div className="col-span-4 md:col-span-3 text-sm flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold bg-muted text-foreground">{initial}</div>
                        <span className="truncate">{file.uploadedByName}</span>
                      </div>
                      <div className="col-span-2 text-right flex items-center justify-end gap-2">
                        <span className={`text-xs px-2 py-1 rounded-md font-semibold ${file.status === "VERIFIED" || file.status === "PROCESSED" ? "bg-green-100 text-green-700" : file.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {file.status}
                        </span>
                        <button 
                          onClick={() => handleDelete(file.materialId, file.s3Key)}
                          className="text-muted-foreground hover:text-red-500 hover:bg-red-100/50 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete material"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                <input type="file" name="file" accept=".pdf,.pptx,.docx,.doc,.png,.jpg,.jpeg" required className="w-full text-sm border border-border rounded-lg p-2" />
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

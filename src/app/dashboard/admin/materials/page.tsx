"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

interface Material {
  materialId: string;
  classId: string;
  fileName: string;
  fileType: string;
  storageKey: string;
  materialType: string;
  uploadedBy: string;
  uploadedByName: string;
  status: string;
  rejectionReason?: string;
  uploadedAt: string;
}

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<Material | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchPendingMaterials();
  }, []);

  // Focus textarea when modal opens
  useEffect(() => {
    if (rejectTarget) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [rejectTarget]);

  const fetchPendingMaterials = async () => {
    try {
      const res = await fetch("/api/admin/materials");
      const json = await res.json();
      if (json.success) {
        setMaterials(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (material: Material) => {
    setActionLoading(material.materialId);
    try {
      const res = await fetch("/api/admin/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: material.classId,
          materialId: material.materialId,
          storageKey: material.storageKey,
          fileName: material.fileName,
          action: "APPROVE",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMaterials(prev => prev.filter(m => m.materialId !== material.materialId));
        toast.success("Material approved and sent for processing.");
      } else {
        toast.error("Approval failed: " + json.message);
      }
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Failed to approve material.");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (material: Material) => {
    setRejectReason("");
    setRejectTarget(material);
  };

  const closeRejectModal = () => {
    setRejectTarget(null);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const material = rejectTarget;
    closeRejectModal();
    setActionLoading(material.materialId);
    try {
      const res = await fetch("/api/admin/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: material.classId,
          materialId: material.materialId,
          storageKey: material.storageKey,
          action: "REJECT",
          rejectionReason: rejectReason.trim() || "No reason provided",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMaterials(prev => prev.filter(m => m.materialId !== material.materialId));
        toast.success("Material rejected.");
      } else {
        toast.error("Rejection failed: " + json.message);
      }
    } catch (error) {
      console.error("Reject error:", error);
      toast.error("Failed to reject material.");
    } finally {
      setActionLoading(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📕";
    if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "📊";
    if (fileType.includes("word") || fileType.includes("document")) return "📝";
    if (fileType.includes("image")) return "🖼️";
    return "📄";
  };

  return (
    <div className="flex flex-col gap-6 h-full bg-background animate-in fade-in duration-300">
      {/* Header */}
      <section className="bg-ecu-purple/5 border border-ecu-purple/10 rounded-xl shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
              <span>📄</span> Pending Material Uploads
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Review uploaded files before they are processed by the AI backend. Approve or reject materials with a reason visible to the uploader.
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            materials.length > 0
              ? "bg-ecu-gold/20 text-ecu-purple border-ecu-gold/30"
              : "bg-muted text-muted-foreground border-border"
          }`}>
            {materials.length} Pending
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-16 text-muted-foreground animate-pulse">
            Loading pending uploads...
          </div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 mt-4 bg-background border border-dashed border-ecu-purple/20 hover:border-ecu-purple/40 transition-colors rounded-lg text-center">
            <span className="text-5xl mb-4 drop-shadow-sm">✅</span>
            <h3 className="text-lg font-bold text-foreground mb-1">All uploads reviewed!</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              No pending materials waiting for review. New uploads will appear here when students submit them.
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {materials.map((mat) => (
              <div
                key={mat.materialId}
                className="bg-background border border-border/60 rounded-xl p-5 hover:border-ecu-purple/30 transition-colors shadow-sm"
              >
                {/* Top row: file info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-2xl shrink-0 mt-0.5">{getFileIcon(mat.fileType)}</span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate" title={mat.fileName}>
                        {mat.fileName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="font-semibold bg-muted px-2 py-0.5 rounded text-foreground">
                          {mat.classId.toUpperCase()}
                        </span>
                        <span>📂 {mat.materialType}</span>
                        <span>👤 {mat.uploadedByName || mat.uploadedBy}</span>
                        <span>📅 {new Date(mat.uploadedAt).toLocaleDateString()} {new Date(mat.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                  <div className="flex-1" />
                  <button
                    onClick={() => handleApprove(mat)}
                    disabled={actionLoading === mat.materialId}
                    className="px-5 py-2 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === mat.materialId ? "Processing..." : "✓ Approve & Process"}
                  </button>
                  <button
                    onClick={() => openRejectModal(mat)}
                    disabled={actionLoading === mat.materialId}
                    className="px-5 py-2 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reject Modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => { if (e.target === e.currentTarget) closeRejectModal(); }}
        >
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in zoom-in-95 duration-150">
            {/* Modal header */}
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground">Reject Material</h3>
                <p className="text-sm text-muted-foreground mt-0.5 truncate" title={rejectTarget.fileName}>
                  {rejectTarget.fileName}
                </p>
              </div>
            </div>

            {/* Reason input */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Rejection Reason
                <span className="text-muted-foreground font-normal ml-1">(visible to uploader)</span>
              </label>
              <textarea
                ref={textareaRef}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirmReject(); }}
                placeholder="e.g. This file does not appear to be relevant to the class syllabus."
                rows={4}
                className="w-full px-3 py-2.5 text-sm bg-muted/40 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-400 transition-colors placeholder:text-muted-foreground/60"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Leave blank to submit with &ldquo;No reason provided&rdquo;.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeRejectModal}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

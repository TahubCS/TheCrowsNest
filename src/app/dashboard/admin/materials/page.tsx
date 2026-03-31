"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Material {
  materialId: string;
  classId: string;
  fileName: string;
  fileType: string;
  s3Key: string;
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
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingMaterials();
  }, []);

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

  const handlePreview = async (material: Material) => {
    setPreviewLoading(material.materialId);
    try {
      const res = await fetch(`/api/admin/materials/preview?s3Key=${encodeURIComponent(material.s3Key)}`);
      const json = await res.json();
      if (json.success && json.data?.previewUrl) {
        window.open(json.data.previewUrl, "_blank");
      } else {
        toast.error("Failed to generate preview: " + json.message);
      }
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to generate preview URL.");
    } finally {
      setPreviewLoading(null);
    }
  };

  const handleApprove = async (material: Material) => {
    if (!confirm(`Approve "${material.fileName}" for processing? This will send it to the AI backend for ingestion.`)) return;
    setActionLoading(material.materialId);
    try {
      const res = await fetch("/api/admin/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: material.classId,
          materialId: material.materialId,
          s3Key: material.s3Key,
          fileName: material.fileName,
          action: "APPROVE",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMaterials(prev => prev.filter(m => m.materialId !== material.materialId));
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

  const handleReject = async (material: Material) => {
    const reason = prompt(`Why are you rejecting "${material.fileName}"?\n\nThis reason will be visible to the uploader.`);
    if (reason === null) return; // cancelled
    setActionLoading(material.materialId);
    try {
      const res = await fetch("/api/admin/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: material.classId,
          materialId: material.materialId,
          s3Key: material.s3Key,
          action: "REJECT",
          rejectionReason: reason || "No reason provided",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMaterials(prev => prev.filter(m => m.materialId !== material.materialId));
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
              Review uploaded files before they are processed by the AI backend. Preview content to ensure materials are appropriate for the class.
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
                  <button
                    onClick={() => handlePreview(mat)}
                    disabled={previewLoading === mat.materialId}
                    className="px-4 py-2 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {previewLoading === mat.materialId ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Opening...
                      </span>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Preview File
                      </>
                    )}
                  </button>

                  <div className="flex-1" />

                  <button
                    onClick={() => handleApprove(mat)}
                    disabled={actionLoading === mat.materialId}
                    className="px-5 py-2 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === mat.materialId ? "Processing..." : "✓ Approve & Process"}
                  </button>
                  <button
                    onClick={() => handleReject(mat)}
                    disabled={actionLoading === mat.materialId}
                    className="px-5 py-2 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === mat.materialId ? "..." : "✕ Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

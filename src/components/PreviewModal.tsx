"use client";

import { useState, useEffect } from "react";

interface PreviewModalProps {
  materialId: string;
  classId: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
}

function getViewerUrl(signedUrl: string, fileType: string): { type: "pdf" | "image" | "docs"; url: string } {
  if (fileType.includes("pdf")) {
    return { type: "pdf", url: signedUrl };
  }
  if (fileType.startsWith("image/")) {
    return { type: "image", url: signedUrl };
  }
  // PPTX, DOCX, etc — use Google Docs Viewer
  return {
    type: "docs",
    url: `https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`,
  };
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return "📕";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "📊";
  if (fileType.includes("word") || fileType.includes("document")) return "📝";
  if (fileType.startsWith("image/")) return "🖼️";
  return "📄";
}

export default function PreviewModal({ materialId, classId, fileName, fileType, onClose }: PreviewModalProps) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [viewerInfo, setViewerInfo] = useState<{ type: "pdf" | "image" | "docs"; url: string; signedUrl: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchUrl() {
      try {
        const res = await fetch(
          `/api/materials/preview?materialId=${encodeURIComponent(materialId)}&classId=${encodeURIComponent(classId)}`,
          { signal: controller.signal }
        );
        const json = await res.json();
        if (!json.success) {
          setErrorMessage(json.message || "Failed to load preview.");
          setState("error");
          return;
        }
        const info = getViewerUrl(json.data.previewUrl, fileType);
        setViewerInfo({ ...info, signedUrl: json.data.previewUrl });
        setState("ready");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setErrorMessage("Failed to connect to the server.");
        setState("error");
      }
    }

    fetchUrl();
    return () => controller.abort();
  }, [materialId, classId, fileType]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col animate-in zoom-in-95 duration-150"
        style={{ height: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <span className="text-xl">{getFileIcon(fileType)}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate" title={fileName}>{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 relative">
          {state === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <svg className="animate-spin w-7 h-7" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm">Loading preview&hellip;</p>
            </div>
          )}

          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p className="font-semibold text-foreground">Preview unavailable</p>
              <p className="text-sm text-muted-foreground max-w-xs">{errorMessage}</p>
            </div>
          )}

          {state === "ready" && viewerInfo && (
            <>
              {viewerInfo.type === "image" ? (
                <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto custom-scrollbar">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewerInfo.url}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <iframe
                  src={viewerInfo.url}
                  className="w-full h-full rounded-b-none border-0"
                  title={fileName}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {state === "ready" && viewerInfo && (
          <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Preview link expires in 15 minutes.</p>
            <a
              href={viewerInfo.signedUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

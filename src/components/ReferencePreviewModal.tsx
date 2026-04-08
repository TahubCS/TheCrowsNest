"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import type { SourceReference } from "@/types";

// Use CDN worker matching the installed pdfjs-dist version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ReferencePreviewModalProps {
  reference: SourceReference;
  classId: string;
  onClose: () => void;
}

type LoadState = "lookup" | "fetching" | "ready" | "error";

function getFileIcon(fileType: string): string {
  if (fileType.includes("pdf")) return "📕";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "📊";
  if (fileType.includes("word") || fileType.includes("document")) return "📝";
  if (fileType.startsWith("image/")) return "🖼️";
  return "📄";
}

// Returns a customTextRenderer that highlights words from the AI snippet
function makeHighlighter(snippet: string) {
  const words = snippet
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .map((w) => w.toLowerCase());

  return ({ str }: { str: string }) => {
    if (!words.length || !str) return str;
    const strLower = str.toLowerCase();
    if (words.some((word) => strLower.includes(word))) {
      // mix-blend-mode:multiply keeps the PDF page content visible while
      // showing the yellow tint — a solid background would cover the page render.
      return `<mark style="background:rgba(253,200,47,0.45);mix-blend-mode:multiply;border-radius:2px;color:inherit;padding:0 1px;">${str}</mark>`;
    }
    return str;
  };
}

export default function ReferencePreviewModal({
  reference,
  classId,
  onClose,
}: ReferencePreviewModalProps) {
  const [loadState, setLoadState] = useState<LoadState>("lookup");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [pdfWidth, setPdfWidth] = useState(760);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Measure viewer container width when it mounts (fires when loadState → ready)
  const onViewerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setPdfWidth(Math.max(300, node.offsetWidth - 32));
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Two-step fetch: fileName → materialId → signedUrl
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        // Step 1: resolve fileName to materialId
        setLoadState("lookup");
        const byNameRes = await fetch(
          `/api/materials/by-name?classId=${encodeURIComponent(classId)}&fileName=${encodeURIComponent(reference.fileName)}`,
          { signal: controller.signal }
        );
        const byName = await byNameRes.json();
        if (!byName.success) {
          throw new Error(byName.message || "Material not found.");
        }

        const { materialId, fileType: ft } = byName.data;
        setFileType(ft);
        setLoadState("fetching");

        // Step 2: get signed URL
        const previewRes = await fetch(
          `/api/materials/preview?materialId=${encodeURIComponent(materialId)}&classId=${encodeURIComponent(classId)}`,
          { signal: controller.signal }
        );
        const preview = await previewRes.json();
        if (!preview.success) {
          throw new Error(preview.message || "Preview unavailable.");
        }

        setSignedUrl(preview.data.previewUrl);
        setLoadState("ready");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to load preview."
        );
        setLoadState("error");
      }
    }

    load();
    return () => controller.abort();
  }, [reference.fileName, classId]);

  const isPdf = fileType.includes("pdf");
  const isImage = fileType.startsWith("image/");
  const pageNumber =
    typeof reference.page === "number"
      ? reference.page
      : typeof reference.page === "string"
      ? parseInt(reference.page) || 1
      : 1;

  const docsViewerUrl = signedUrl
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`
    : null;

  const highlighter = makeHighlighter(reference.snippet ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col animate-in zoom-in-95 duration-150"
        style={{ height: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <span className="text-xl shrink-0">
            {loadState === "ready" ? getFileIcon(fileType) : "📄"}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="font-semibold text-foreground truncate"
              title={reference.fileName}
            >
              {reference.fileName}
            </p>
            {reference.page && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Page {reference.page}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Loading */}
          {(loadState === "lookup" || loadState === "fetching") && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <svg
                className="animate-spin w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm">
                {loadState === "lookup"
                  ? "Locating file\u2026"
                  : "Loading preview\u2026"}
              </p>
            </div>
          )}

          {/* Error */}
          {loadState === "error" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6 py-8">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-foreground">
                Preview unavailable
              </p>
              <p className="text-sm text-muted-foreground max-w-xs">
                {errorMsg}
              </p>
              {/* Fallback: show snippet */}
              {reference.snippet && (
                <div className="mt-4 w-full max-w-md text-left border-l-4 border-ecu-purple pl-4 bg-muted/40 rounded-r-lg py-3 pr-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    AI Reference
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    &ldquo;{reference.snippet}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Ready */}
          {loadState === "ready" && signedUrl && (
            <>
              {/* Viewer */}
              <div
                ref={viewerContainerRef}
                className="flex-1 min-h-0 overflow-auto bg-muted/20 custom-scrollbar"
              >
                <div ref={onViewerRef} className="w-full h-full">
                  {isPdf ? (
                    <div className="flex justify-center py-4 px-4">
                      <Document
                        file={signedUrl}
                        loading={
                          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm animate-pulse">
                            Rendering PDF&hellip;
                          </div>
                        }
                        error={
                          <div className="flex items-center justify-center h-40 text-red-500 text-sm">
                            Failed to load PDF.
                          </div>
                        }
                      >
                        <Page
                          pageNumber={pageNumber}
                          width={Math.min(pdfWidth, 860)}
                          customTextRenderer={highlighter}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                    </div>
                  ) : isImage ? (
                    <div className="flex items-center justify-center p-4 min-h-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={signedUrl}
                        alt={reference.fileName}
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                    </div>
                  ) : docsViewerUrl ? (
                    <iframe
                      src={docsViewerUrl}
                      className="w-full h-full border-0"
                      title={reference.fileName}
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                  ) : null}
                </div>
              </div>

              {/* Snippet panel */}
              {reference.snippet && (
                <div className="shrink-0 border-t border-border px-5 py-3 bg-ecu-purple/5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    AI Reference
                    {reference.page ? ` \u00b7 Page ${reference.page}` : ""}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                    &ldquo;{reference.snippet}&rdquo;
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {loadState === "ready" && signedUrl && (
          <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Preview link expires in 15 minutes.
            </p>
            <a
              href={signedUrl}
              download={reference.fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

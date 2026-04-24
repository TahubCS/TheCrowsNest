"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PreviewModalProps {
  materialId: string;
  classId: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
}

type PreviewState = "loading" | "ready" | "error";
type PreviewType = "pdf" | "image" | "office" | "text" | "unsupported";

interface ViewerInfo {
  type: PreviewType;
  url: string;
  signedUrl: string;
}

const OFFICE_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.at(-1)?.toLowerCase() ?? "" : "";
}

function getViewerInfo(signedUrl: string, fileType: string, fileName: string): ViewerInfo {
  const extension = getFileExtension(fileName);

  if (fileType.includes("pdf") || extension === "pdf") {
    return { type: "pdf", url: signedUrl, signedUrl };
  }

  if (fileType.startsWith("image/")) {
    return { type: "image", url: signedUrl, signedUrl };
  }

  if (fileType.startsWith("text/") || ["txt", "md", "csv", "log"].includes(extension)) {
    return { type: "text", url: signedUrl, signedUrl };
  }

  if (OFFICE_MIME_TYPES.has(fileType) || ["doc", "docx", "ppt", "pptx"].includes(extension)) {
    return {
      type: "office",
      url: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`,
      signedUrl,
    };
  }

  return { type: "unsupported", url: signedUrl, signedUrl };
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "PPT";
  if (fileType.includes("word") || fileType.includes("document")) return "DOC";
  if (fileType.startsWith("image/")) return "IMG";
  if (fileType.startsWith("text/")) return "TXT";
  return "FILE";
}

export default function PreviewModal({
  materialId,
  classId,
  fileName,
  fileType,
  onClose,
}: PreviewModalProps) {
  const [state, setState] = useState<PreviewState>("loading");
  const [viewerInfo, setViewerInfo] = useState<ViewerInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [pdfWidth, setPdfWidth] = useState(780);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPreview() {
      try {
        setState("loading");
        setErrorMessage("");
        setTextContent("");
        setPageCount(0);

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

        const info = getViewerInfo(json.data.previewUrl, fileType, fileName);
        setViewerInfo(info);

        if (info.type === "text") {
          const textRes = await fetch(info.signedUrl, { signal: controller.signal });
          if (!textRes.ok) {
            throw new Error("Failed to load text preview.");
          }

          const content = await textRes.text();
          setTextContent(content);
        }

        setState("ready");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to connect to the server."
        );
        setState("error");
      }
    }

    fetchPreview();
    return () => controller.abort();
  }, [materialId, classId, fileType, fileName]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!pdfContainerRef.current || viewerInfo?.type !== "pdf") return;

    const container = pdfContainerRef.current;
    const updateWidth = () => {
      setPdfWidth(Math.max(280, Math.min(container.clientWidth - 32, 880)));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, [viewerInfo?.type]);

  const renderViewer = () => {
    if (!viewerInfo) return null;

    if (viewerInfo.type === "image") {
      return (
        <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewerInfo.signedUrl}
            alt={fileName}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      );
    }

    if (viewerInfo.type === "pdf") {
      return (
        <div ref={pdfContainerRef} className="absolute inset-0 overflow-auto bg-muted/20">
          <div className="flex min-h-full justify-center px-4 py-5">
            <Document
              file={viewerInfo.signedUrl}
              onLoadSuccess={({ numPages }) => setPageCount(numPages)}
              loading={
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  Rendering PDF...
                </div>
              }
              error={
                <div className="flex h-40 items-center justify-center px-6 text-sm text-red-500">
                  Failed to load the PDF preview.
                </div>
              }
            >
              {Array.from({ length: pageCount || 0 }, (_, index) => (
                <div key={index + 1} className="mb-4 last:mb-0">
                  <Page
                    pageNumber={index + 1}
                    width={pdfWidth}
                    renderAnnotationLayer={false}
                  />
                </div>
              ))}
            </Document>
          </div>
        </div>
      );
    }

    if (viewerInfo.type === "text") {
      return (
        <div className="absolute inset-0 overflow-auto bg-muted/20 p-5">
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-border bg-background p-4 font-mono text-sm text-foreground">
            {textContent || "This text file is empty."}
          </pre>
        </div>
      );
    }

    if (viewerInfo.type === "office") {
      return (
        <iframe
          src={viewerInfo.url}
          className="h-full w-full border-0"
          title={fileName}
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      );
    }

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="w-12 rounded-full bg-muted px-3 py-3 text-xs font-bold text-muted-foreground">
          FILE
        </div>
        <p className="font-semibold text-foreground">Preview not supported for this file type.</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Open it in a new tab or download it instead.
        </p>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-[85vh] w-full max-w-5xl flex-col rounded-2xl border border-border bg-background shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 shrink-0">
          <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold tracking-wide text-muted-foreground">
            {getFileIcon(fileType)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground" title={fileName}>
              {fileName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground shrink-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-background">
          {state === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <svg className="h-7 w-7 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-sm">Loading preview...</p>
            </div>
          )}

          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-foreground">Preview unavailable</p>
              <p className="max-w-xs text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          )}

          {state === "ready" && renderViewer()}
        </div>

        {state === "ready" && viewerInfo && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 shrink-0">
            <p className="text-xs text-muted-foreground">Preview link expires in 15 minutes.</p>
            <div className="flex items-center gap-2">
              <a
                href={viewerInfo.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 3h7v7m0-7L10 14m-4 0H3v7h7"
                  />
                </svg>
                Open
              </a>
              <a
                href={viewerInfo.signedUrl}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/80"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
        )}
      </div>
    </div>
  );
}

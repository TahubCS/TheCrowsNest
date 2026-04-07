"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SourceReference } from "@/types";

interface ReferenceModalProps {
  reference: SourceReference | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReferenceModal({ reference, isOpen, onClose }: ReferenceModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !reference || !mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-background border border-border shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div>
            <h3 className="text-lg font-bold text-foreground">Reference Highlight</h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-[90%] truncate">
              {reference.fileName} {reference.page ? `• Page ${reference.page}` : ""}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh] bg-background">
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-ecu-purple rounded-full"></div>
            <p className="pl-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap font-medium">
              "{reference.snippet}"
            </p>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-border bg-muted/10 flex justify-end">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold text-sm bg-muted/50 hover:bg-muted border border-border rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Material Upload Safety — Constants, thresholds, and reason codes.
 * Central source of truth for the upload-to-embedding pipeline gates.
 */

// ============================================================
// Thresholds (v1)
// ============================================================

export const UPLOAD_THRESHOLDS = {
  maxFileSizeBytes: 20 * 1024 * 1024, // 20 MB
  maxPagesAuto: 300,
  minExtractChars: 120,
  minOcrChars: 80,
  maxGarbleRatio: 0.35,
  approveConfidence: 75,
  rejectConfidence: 50,
  maxChunksPerMaterial: 800,
  rateLimitUploads: 10,
  rateLimitWindowMinutes: 10,
} as const;

// ============================================================
// MIME ↔ Extension mapping
// ============================================================

export const MIME_EXTENSION_MAP: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/msword": ["doc"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
};

/** Flat set of allowed MIME types */
export const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSION_MAP));

/** Returns the canonical extension for a MIME type (first in the list) */
export function canonicalExtension(mime: string): string | undefined {
  return MIME_EXTENSION_MAP[mime]?.[0];
}

/** Checks whether a file extension matches its claimed MIME type */
export function extensionMatchesMime(extension: string, mime: string): boolean {
  const allowed = MIME_EXTENSION_MAP[mime];
  if (!allowed) return false;
  return allowed.includes(extension.toLowerCase());
}

// ============================================================
// Reason codes
// ============================================================

export type ReasonCode =
  | "unsupported_type"
  | "mime_extension_mismatch"
  | "file_too_large"
  | "magic_bytes_mismatch"
  | "invalid_filename"
  | "duplicate_content"
  | "unreadable_file"
  | "encrypted_file"
  | "excessive_pages"
  | "empty_or_low_text"
  | "garbled_text"
  | "low_ocr_content"
  | "irrelevant_material"
  | "low_relevance_confidence"
  | "uncertain_relevance"
  | "approved"
  | "excessive_chunks"
  | "embedding_failed"
  | "rate_limited"
  | "suspicious_upload_pattern";

/** Human-readable messages shown to the user, keyed by reason code */
export const REASON_MESSAGES: Record<ReasonCode, string> = {
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

// ============================================================
// Material statuses
// ============================================================

export type MaterialStatus = "PENDING_REVIEW" | "PROCESSED" | "REJECTED" | "FAILED";

// ============================================================
// Filename validation
// ============================================================

/** Characters/patterns that are unsafe in filenames */
const UNSAFE_FILENAME_PATTERN = /[<>:"/\\|?*\x00-\x1f]|\.\.|\.\//;

/** Max filename length (bytes) */
const MAX_FILENAME_LENGTH = 255;

/**
 * Validates and normalizes a filename.
 * Returns the sanitized name or null if the filename is fundamentally invalid.
 */
export function sanitizeFilename(raw: string): string | null {
  if (!raw || raw.length > MAX_FILENAME_LENGTH) return null;

  const trimmed = raw.trim();
  if (!trimmed || trimmed === "." || trimmed === "..") return null;

  if (UNSAFE_FILENAME_PATTERN.test(trimmed)) return null;

  return trimmed;
}

/**
 * Extracts the extension from a filename (lowercase, without the dot).
 */
export function extractExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex < 1) return "";
  return filename.slice(dotIndex + 1).toLowerCase();
}

export function aiBackendUrl(path: string): string {
  const baseUrl = process.env.AI_BACKEND_URL?.trim();
  if (!baseUrl) {
    throw new Error("AI_BACKEND_URL is not configured.");
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

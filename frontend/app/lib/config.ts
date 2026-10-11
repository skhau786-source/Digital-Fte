const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000";

export const API_BASE_URL = apiUrl.replace(/\/+$/, "");

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

const browserHost = window.location.hostname;
const localApiHost = browserHost && browserHost !== "localhost" ? browserHost : "127.0.0.1";
const defaultApiUrl =
  window.location.protocol === "https:" ? window.location.origin : `http://${localApiHost}:8000`;

export const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

export function resolveApiAssetUrl(path: string): string {
  if (!path || /^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

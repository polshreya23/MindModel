const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';

/**
 * Normalized backend API base URL.
 * - In local dev (empty), defaults to same-origin relative `/api/...`.
 * - In production on Vercel, set `VITE_API_BASE_URL` to your Render backend URL
 *   (e.g. `https://modelmind-backend.onrender.com`).
 */
export const API_BASE_URL = rawApiBase.trim().replace(/\/+$/, '');

export function apiUrl(endpointPath: string): string {
  const normalizedPath = endpointPath.startsWith('/')
    ? endpointPath
    : `/${endpointPath}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

// Central API helpers for the frontend.
// - API_BASE: origin of the backend server (no trailing slash) — single source
//   of truth lives in ../config/api (reads VITE_API_URL, falls back to local dev).
// - apiUrl(path): build a full backend URL from a leading-slash path, e.g. apiUrl('/login').
// - resolveFileUrl(value): turn a stored file reference into a usable URL.
//     Files are stored as full Supabase public URLs, but older/relative
//     paths (e.g. "/uploads/..") are prefixed with API_BASE for backward compat.
import { API_BASE } from '../config/api';

export { API_BASE };

export function apiUrl(path = "") {
  if (!path) return API_BASE;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function resolveFileUrl(value) {
  if (!value) return "";
  // Already an absolute URL (Supabase public URL, or any http/https/data URI).
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  // Relative path stored on the backend — prefix with the API origin.
  return `${API_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
}

export default { API_BASE, apiUrl, resolveFileUrl };

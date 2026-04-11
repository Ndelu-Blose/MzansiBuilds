/**
 * Normalizes REACT_APP_BACKEND_URL to an API host origin (no trailing slash, no /api suffix).
 * Callers append `/api` themselves so both `https://host` and `https://host/api` work.
 */
export function getBackendOrigin() {
  let raw = (process.env.REACT_APP_BACKEND_URL || '').trim();
  if (!raw) return '';
  raw = raw.replace(/\/+$/, '');
  if (raw.endsWith('/api')) {
    raw = raw.slice(0, -4).replace(/\/+$/, '');
  }
  return raw;
}

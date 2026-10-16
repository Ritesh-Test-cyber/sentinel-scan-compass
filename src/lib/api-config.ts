export type ApiMode = 'mock' | 'live' | 'disconnected';
export type ApiConfig = { mode: ApiMode; baseUrl: string | null; reason: string };

/**
 * Resolves which scanner adapter to use from Vite env values:
 * - VITE_API_BASE_URL set (http/https) -> live FastAPI adapter.
 * - VITE_USE_MOCK_API=true in a dev build -> mock adapter (local UI development only).
 * - No base URL in a dev build -> mock adapter, clearly labeled.
 * - Production build without a valid base URL -> disconnected. Mock data is never used in production.
 */
export function resolveApiConfig(env: { baseUrl?: string | undefined; useMock?: string | undefined; dev: boolean }): ApiConfig {
  const raw = env.baseUrl?.trim();
  const wantsMock = env.useMock === 'true';
  if (wantsMock && env.dev) return { mode: 'mock', baseUrl: null, reason: 'Mock mode enabled with VITE_USE_MOCK_API for local UI development.' };
  if (raw) {
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('bad');
      return { mode: 'live', baseUrl: url.toString().replace(/\/+$/, ''), reason: 'Connected to the configured FastAPI backend.' };
    } catch {
      return { mode: 'disconnected', baseUrl: null, reason: 'VITE_API_BASE_URL is not a valid http(s) URL without credentials.' };
    }
  }
  if (env.dev) return { mode: 'mock', baseUrl: null, reason: 'No VITE_API_BASE_URL is set, so the development build uses the mock adapter.' };
  return { mode: 'disconnected', baseUrl: null, reason: wantsMock ? 'Mock mode is disabled in production builds. Set VITE_API_BASE_URL.' : 'VITE_API_BASE_URL is not configured for this build.' };
}

export const apiConfig: ApiConfig = resolveApiConfig({
  baseUrl: import.meta.env['VITE_API_BASE_URL'] as string | undefined,
  useMock: import.meta.env['VITE_USE_MOCK_API'] as string | undefined,
  dev: Boolean(import.meta.env.DEV),
});

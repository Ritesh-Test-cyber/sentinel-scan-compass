import { queryOptions } from '@tanstack/react-query';
import { scans as demoScans, findings as demoFindings } from './demo-data';
import { limitationsNotice, redactEvidence } from './evidence';
import { apiConfig } from './api-config';
import { ApiError, ScanNotFoundError } from './api-errors';
import { createDisconnectedScannerApi, createHttpScannerApi } from './http-scanner-api';
import { activeStatuses, createScanSchema, emptyCounts, type Finding, type Report, type ReportFormat, type ScannerApi, type ScanRecord } from './scanner-types';

export * from './scanner-types';
export { ApiError, ScanNotFoundError } from './api-errors';

const pause = () => new Promise<void>(resolve => setTimeout(resolve, 450));
function seed(): ScanRecord[] {
  return demoScans.map((scan, index) => {
    const createdAt = ['2026-10-15T10:42:00Z', '2026-10-15T10:38:00Z', '2026-10-14T16:20:00Z', '2026-10-14T14:05:00Z', '2026-10-13T09:15:00Z', '2026-10-12T11:30:00Z'][index] ?? '2026-10-12T11:30:00Z';
    const results: Finding[] = Array.from({ length: scan.findings }, (_, i) => {
      const item = (i < scan.high ? demoFindings[i % 3] : demoFindings[3 + i % 2]) ?? demoFindings[0];
      if (!item) throw new Error('Demo fixture missing');
      const path = i < 5 ? item.path : ['/account', '/dashboard', '/api/v1', '/settings'][i % 4];
      return { ...item, id: `${scan.id}-F-${i + 1}`, title: i < 5 ? item.title : `${item.title} (${path})`, confidence: i % 3 === 0 ? 'Medium' : 'High', verification: 'Potential', whyItMatters: 'This configuration may weaken defense in depth in some contexts. The observed response alone does not establish exploitability; assess application behavior and compensating controls before prioritizing a fix.', firstDetectedAt: createdAt, relatedEndpoints: [`https://${scan.target}/`, `https://${scan.target}/account`], affectedUrl: `https://${scan.target}${path}` };
    });
    const counts = emptyCounts(); results.forEach(f => counts[f.severity]++);
    return { ...scan, profile: scan.profile === 'Passive' ? 'Basic' : 'Standard', demo: true, createdAt, startedAt: createdAt, completedAt: scan.status === 'Completed' || scan.status === 'Failed' ? new Date(new Date(createdAt).getTime() + 272000).toISOString() : null, endpoints: scan.findings ? 38 - index * 4 : 0, counts, results, scope: 'Demo scope: target base URL only', reportFormats: scan.status === 'Completed' ? ['json', 'html'] : [], canCancel: false, ...(scan.status === 'Failed' ? { error: 'Simulated connection timeout. No actual network request was made.' } : {}) };
  });
}
// MOCK ONLY (local UI development): no network requests, no target resolution, no security tests.
// The live FastAPI backend MUST enforce identity/ownership and authorization, destination IP/DNS
// checks on each connection, redirects, timeouts and request limits.
export function redactScan(scan: ScanRecord): ScanRecord {
  const redactValue = (value: unknown): unknown => typeof value === 'string' ? redactEvidence(value) : Array.isArray(value) ? value.map(redactValue) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item)])) : value;
  return redactValue(scan) as ScanRecord;
}
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
export function createMockScannerApi(): ScannerApi {
  let records: ScanRecord[] | null = null;
  const all = () => (records ??= seed());
  return {
    mode: 'mock', capabilities: { settings: false, authorizedTargets: false },
    async health() { return { ok: true, mode: 'mock' }; },
    async listScans() { await pause(); return all().map(redactScan); },
    async getScan(id) { await pause(); const scan = all().find(s => s.id === id); if (!scan) throw new ScanNotFoundError('This scan does not exist in the current demo workspace. Demo records reset on refresh.'); return redactScan(scan); },
    async createScan(input) {
      const valid = createScanSchema.parse(input); await new Promise(resolve => setTimeout(resolve, 1000));
      const now = new Date().toISOString(); const id = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const scan: ScanRecord = { id, target: valid.target, name: valid.name || new URL(valid.target).hostname, profile: valid.profile, status: 'Pending', date: new Date(now).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC', duration: '—', findings: 0, high: 0, demo: true, createdAt: now, startedAt: null, completedAt: null, endpoints: 0, counts: emptyCounts(), results: [], scope: 'Demo scope: target base URL only', reportFormats: [], canCancel: true };
      records = [scan, ...all()]; return scan;
    },
    async cancelScan(id) {
      await pause(); const scan = all().find(s => s.id === id); if (!scan) throw new ScanNotFoundError();
      if (!scan.canCancel) throw new ApiError('validation', { message: 'Only pending or running scans can be cancelled.' });
      const updated: ScanRecord = { ...scan, status: 'Cancelled', canCancel: false, completedAt: new Date().toISOString() };
      records = all().map(s => s.id === id ? updated : s); return redactScan(updated);
    },
    async exportReport(id, format) {
      const scan = redactScan(await this.getScan(id));
      if (!scan.reportFormats.includes(format)) throw new ApiError('not_found', { message: 'Reports are available for completed demo scans only.' });
      const notice = 'DEMO REPORT — Illustrative data only. No security testing was performed.';
      const e = escapeHtml;
      return format === 'json'
        ? { filename: `websentinel-demo-${id}.json`, mime: 'application/json', content: JSON.stringify({ notice, limitations: limitationsNotice, scan }, null, 2) }
        : { filename: `websentinel-demo-${id}.html`, mime: 'text/html', content: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>WebSentinel demo report</title></head><body><h1>WebSentinel — Demo report</h1><p>${notice}</p><p>${e(limitationsNotice)}</p><h2>${e(scan.target)}</h2><p>Scan ${e(id)} · Status ${e(scan.status)} · Scope ${e(scan.scope ?? 'Not provided')}</p><p>Started ${e(scan.startedAt ?? '—')} · Completed ${e(scan.completedAt ?? '—')}</p><p>Summary: ${Object.entries(scan.counts).map(([k, v]) => `${e(k)} ${v}`).join(', ')}</p>${scan.results.map(f => `<article><h3>${e(f.severity)}: ${e(f.title)}</h3><p>Finding ID: ${e(f.id)}</p><p>Confidence: ${e(f.confidence)} · Verification: ${e(f.verification)}</p><p>Category: ${e(f.category)}</p><p>Endpoint: ${e(f.affectedUrl)}</p><p>${e(f.description)}</p><h4>Observed demo evidence</h4><pre>${e(f.evidence)}</pre><h4>Why it matters</h4><p>${e(f.whyItMatters)}</p><p>First detected: ${e(f.firstDetectedAt ?? 'Not available')}</p><p>Related endpoints: ${(f.relatedEndpoints ?? []).map(e).join(', ')}</p><p>Remediation: ${e(f.remediation)}</p></article>`).join('')}</body></html>` };
    },
  };
}

export const scannerApi: ScannerApi = apiConfig.mode === 'live' && apiConfig.baseUrl
  ? createHttpScannerApi({ baseUrl: apiConfig.baseUrl })
  : apiConfig.mode === 'mock' ? createMockScannerApi() : createDisconnectedScannerApi(apiConfig.reason);

export const POLL_INTERVAL_MS = 5000;
export const healthOptions = queryOptions({ queryKey: ['health'], queryFn: () => scannerApi.health(), refetchInterval: 60000, retry: false });
export const scanListOptions = queryOptions({ queryKey: ['scans'], queryFn: () => scannerApi.listScans(), retry: (count, error) => error instanceof ApiError && error.retryable && count < 2, refetchInterval: q => q.state.data?.some(s => activeStatuses.includes(s.status)) ? POLL_INTERVAL_MS * 2 : false });
export const scanOptions = (id: string) => queryOptions({ queryKey: ['scans', id], queryFn: () => scannerApi.getScan(id), retry: (count, error) => error instanceof ApiError && error.retryable && count < 2, refetchInterval: q => q.state.data && activeStatuses.includes(q.state.data.status) ? POLL_INTERVAL_MS : false });
export function saveReport(report: Report) { const url = URL.createObjectURL(new Blob([report.content], { type: report.mime })); const a = document.createElement('a'); a.href = url; a.download = report.filename; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
export type { ReportFormat };

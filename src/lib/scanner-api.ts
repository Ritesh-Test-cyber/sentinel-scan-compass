import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { scans as demoScans, findings as demoFindings, type Scan, type Severity } from './demo-data';

export const createScanSchema = z.object({
  target: z.string().trim().min(1, 'Enter a target base URL.').max(2048, 'The URL is too long.').url('Enter a valid URL, for example https://app.example.com.').refine(value => { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; } }, 'Use an http:// or https:// URL without embedded credentials.'),
  name: z.string().trim().max(100, 'Use 100 characters or fewer.').optional(),
  profile: z.enum(['Basic', 'Standard']),
  authorized: z.boolean().refine(value => value, 'Confirm that you own this system or have explicit permission to test it.'),
});
export type CreateScanInput = z.infer<typeof createScanSchema>;
export type Finding = typeof demoFindings[number] & { confidence: 'High' | 'Medium' | 'Low'; verification: 'Unverified' | 'Confirmed'; affectedUrl: string };
export type SeverityCounts = Record<Severity, number>;
export type ScanRecord = Scan & { demo: true; createdAt: string; startedAt: string | null; completedAt: string | null; endpoints: number; counts: SeverityCounts; results: Finding[]; error?: string };
export type ReportFormat = 'json' | 'html';
export type Report = { filename: string; content: string; mime: string };
export interface ScannerApi {
  readonly mode: 'mock' | 'live';
  listScans(): Promise<ScanRecord[]>;
  getScan(id: string): Promise<ScanRecord>;
  createScan(input: CreateScanInput): Promise<ScanRecord>;
  supportedReports: readonly ReportFormat[];
  exportReport(id: string, format: ReportFormat): Promise<Report>;
}
export class ScanNotFoundError extends Error { constructor() { super('This scan does not exist in the current demo workspace.'); this.name = 'ScanNotFoundError'; } }
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 450));
const emptyCounts = (): SeverityCounts => ({ Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 });
let records: ScanRecord[] = demoScans.map((scan, index) => {
  const createdAt = ['2026-10-15T10:42:00Z', '2026-10-15T10:38:00Z', '2026-10-14T16:20:00Z', '2026-10-14T14:05:00Z', '2026-10-13T09:15:00Z', '2026-10-12T11:30:00Z'][index] ?? '2026-10-12T11:30:00Z';
  const results: Finding[] = Array.from({ length: scan.findings }, (_, i) => {
    const template = i < scan.high ? demoFindings[i % 3] : demoFindings[3 + i % 2];
    const fallback = demoFindings[0];
    if (!template || !fallback) throw new Error('Demo fixture missing');
    const item = template ?? fallback;
    return { ...item, id: `${scan.id}-F-${i + 1}`, title: i < 5 ? item.title : `${item.title} (${['/account', '/dashboard', '/api/v1', '/settings'][i % 4]})`, confidence: i % 3 === 0 ? 'Medium' : 'High', verification: 'Unverified', affectedUrl: `https://${scan.target}${i < 5 ? item.path : ['/account', '/dashboard', '/api/v1', '/settings'][i % 4]}` };
  });
  const counts = emptyCounts(); results.forEach(f => counts[f.severity]++);
  return { ...scan, profile: scan.profile === 'Passive' ? 'Basic' : 'Standard', demo: true, createdAt, startedAt: createdAt, completedAt: scan.status === 'Completed' || scan.status === 'Failed' ? new Date(new Date(createdAt).getTime() + 272000).toISOString() : null, endpoints: scan.findings ? 38 - index * 4 : 0, counts, results, ...(scan.status === 'Failed' ? { error: 'Simulated connection timeout. No actual network request was made.' } : {}) };
});
// MOCK ONLY: no network requests, no target resolution, no actual security tests.
// A live FastAPI implementation MUST enforce identity/ownership and authorization,
// destination IP/DNS checks on each connection, redirects, timeouts and request limits.
// Neither this adapter nor browser validation is a live-scanning security boundary.
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
export const scannerApi: ScannerApi = {
  mode: 'mock', supportedReports: ['json', 'html'],
  async listScans() { await pause(); return [...records]; },
  async getScan(id) { await pause(); const scan = records.find(s => s.id === id); if (!scan) throw new ScanNotFoundError(); return scan; },
  async createScan(input) {
    const valid = createScanSchema.parse(input); await new Promise(resolve => setTimeout(resolve, 1000));
    const now = new Date().toISOString(); const id = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const scan: ScanRecord = { id, target: valid.target, name: valid.name || new URL(valid.target).hostname, profile: valid.profile, status: 'Pending', date: new Date(now).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC', duration: '—', findings: 0, high: 0, demo: true, createdAt: now, startedAt: null, completedAt: null, endpoints: 0, counts: emptyCounts(), results: [] };
    records = [scan, ...records]; return scan;
  },
  async exportReport(id, format) {
    const scan = await this.getScan(id);
    if (scan.status !== 'Completed') throw new Error('Reports are available for completed demo scans only.');
    const notice = 'DEMO REPORT — Illustrative data only. No security testing was performed.';
    return format === 'json' ? { filename: `websentinel-demo-${id}.json`, mime: 'application/json', content: JSON.stringify({ notice, scan }, null, 2) } : { filename: `websentinel-demo-${id}.html`, mime: 'text/html', content: `<!doctype html><html lang="en"><meta charset="utf-8"><title>WebSentinel demo report</title><body><h1>WebSentinel — Demo report</h1><p>${notice}</p><h2>${escapeHtml(scan.target)}</h2><p>Scan ${escapeHtml(id)}</p>${scan.results.map(f => `<article><h3>${escapeHtml(f.severity)}: ${escapeHtml(f.title)}</h3><p>${escapeHtml(f.affectedUrl)}</p><p>${escapeHtml(f.description)}</p><pre>${escapeHtml(f.evidence)}</pre><p>Remediation: ${escapeHtml(f.remediation)}</p></article>`).join('')}</body></html>` };
  },
};
export const scanListOptions = queryOptions({ queryKey: ['scans'], queryFn: () => scannerApi.listScans() });
export const scanOptions = (id: string) => queryOptions({ queryKey: ['scans', id], queryFn: () => scannerApi.getScan(id), retry: (count, error) => !(error instanceof ScanNotFoundError) && count < 2 });
export function saveReport(report: Report) { const url = URL.createObjectURL(new Blob([report.content], { type: report.mime })); const a = document.createElement('a'); a.href = url; a.download = report.filename; a.click(); URL.revokeObjectURL(url); }
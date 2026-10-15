import { describe, expect, it } from 'vitest';
import { createScanSchema, scannerApi, ScanNotFoundError } from '@/lib/scanner-api';
const valid = { target: 'https://authorized.example.com', name: 'Demo assessment', profile: 'Basic' as const, authorized: true };
describe('Scanner API boundary', () => {
  it.each(['ftp://example.com', 'javascript:alert(1)', 'not-a-url', 'https://user:password@example.com'])('rejects invalid target %s', target => {
    expect(createScanSchema.safeParse({ ...valid, target }).success).toBe(false);
  });
  it('requires explicit authorization', () => {
    expect(createScanSchema.safeParse({ ...valid, authorized: false }).success).toBe(false);
  });
  it('creates only pending demo records and returns their actual ID', async () => {
    const scan = await scannerApi.createScan(valid);
    expect(scan.id).toMatch(/^DEMO-/);
    expect(scan.status).toBe('Pending');
    expect(scan.demo).toBe(true);
    expect(scan.results).toEqual([]);
    expect((await scannerApi.getScan(scan.id)).target).toBe(valid.target);
    expect((await scannerApi.listScans()).some(s => s.id === scan.id)).toBe(true);
  });
  it('validates at the adapter boundary as well as the form', async () => {
    await expect(scannerApi.createScan({ ...valid, authorized: false })).rejects.toThrow();
  });
  it('returns a typed missing-record error', async () => {
    await expect(scannerApi.getScan('missing')).rejects.toBeInstanceOf(ScanNotFoundError);
  });
  it('exports clearly labeled demo JSON and HTML', async () => {
    const json = await scannerApi.exportReport('WS-0024', 'json');
    expect(JSON.parse(json.content).scan.demo).toBe(true);
    const html = await scannerApi.exportReport('WS-0024', 'html');
    expect(html.content).toContain('DEMO REPORT');
    expect(html.content).toContain('No security testing was performed');
  });
  it('does not offer a report for an unfinished scan', async () => {
    await expect(scannerApi.exportReport('WS-0023', 'json')).rejects.toThrow('completed demo scans only');
  });
  it('keeps finding totals consistent with the visible demo findings', async () => {
    const rows = await scannerApi.listScans();
    rows.forEach(scan => {
      expect(scan.results.length).toBe(scan.findings);
      expect(Object.values(scan.counts).reduce((a,b) => a+b, 0)).toBe(scan.findings);
    });
  });
});
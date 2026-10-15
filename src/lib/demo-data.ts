export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
export type ScanStatus = 'Completed' | 'Running' | 'Failed' | 'Pending' | 'Cancelled';
export type Scan = { id: string; target: string; name: string; status: ScanStatus; date: string; duration: string; findings: number; high: number; profile: string };
export const scans: Scan[] = [
  { id: 'WS-0024', target: 'app.acme.io', name: 'Acme production', status: 'Completed', date: 'Oct 15, 2026 · 10:42', duration: '4m 32s', findings: 12, high: 3, profile: 'Standard' },
  { id: 'WS-0023', target: 'staging.acme.io', name: 'Acme staging', status: 'Running', date: 'Oct 15, 2026 · 10:38', duration: '2m 18s', findings: 5, high: 1, profile: 'Standard' },
  { id: 'WS-0022', target: 'api.acme.io', name: 'Public API', status: 'Completed', date: 'Oct 14, 2026 · 16:20', duration: '3m 08s', findings: 8, high: 2, profile: 'Passive' },
  { id: 'WS-0021', target: 'portal.acme.io', name: 'Customer portal', status: 'Completed', date: 'Oct 14, 2026 · 14:05', duration: '5m 12s', findings: 6, high: 0, profile: 'Standard' },
  { id: 'WS-0020', target: 'dev.acme.io', name: 'Development', status: 'Failed', date: 'Oct 13, 2026 · 09:15', duration: '0m 42s', findings: 0, high: 0, profile: 'Passive' },
  { id: 'WS-0019', target: 'www.acme.io', name: 'Marketing website', status: 'Completed', date: 'Oct 12, 2026 · 11:30', duration: '2m 54s', findings: 4, high: 0, profile: 'Passive' },
];
export const findings: { id: string; title: string; severity: Severity; category: string; path: string; description: string; evidence: string; remediation: string }[] = [
  { id: 'F-001', title: 'Content Security Policy header missing', severity: 'High', category: 'Security headers', path: '/', description: 'The response does not include a Content-Security-Policy header, reducing protection against injected content.', evidence: 'GET / HTTP/1.1\nHTTP/1.1 200 OK\nContent-Security-Policy: [not present]', remediation: 'Define a restrictive Content-Security-Policy. Start with default-src and explicitly allow only trusted sources.' },
  { id: 'F-002', title: 'Session cookie missing HttpOnly flag', severity: 'High', category: 'Cookie security', path: '/login', description: 'A session cookie is accessible to client-side scripts in this illustrative response.', evidence: 'Set-Cookie: session=[REDACTED]; Secure; SameSite=Lax', remediation: 'Set the HttpOnly attribute on all session cookies and keep Secure and SameSite protections.' },
  { id: 'F-003', title: 'Strict Transport Security not configured', severity: 'High', category: 'Security headers', path: '/', description: 'The response does not instruct browsers to enforce HTTPS for subsequent requests.', evidence: 'Strict-Transport-Security: [not present]', remediation: 'Enable HSTS after confirming HTTPS coverage for the application and its subdomains.' },
  { id: 'F-004', title: 'Server version disclosed in response', severity: 'Medium', category: 'Information disclosure', path: '/api/health', description: 'A response header reveals server software version information.', evidence: 'Server: nginx/1.24.0', remediation: 'Disable detailed server version headers in the reverse proxy configuration.' },
  { id: 'F-005', title: 'Referrer Policy header missing', severity: 'Low', category: 'Security headers', path: '/', description: 'No explicit referrer policy was present in the sample response.', evidence: 'Referrer-Policy: [not present]', remediation: 'Set Referrer-Policy to strict-origin-when-cross-origin or a stricter policy.' },
];
export function pageHead(title: string, description: string) {
  return { meta: [{ title: `${title} · WebSentinel` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} · WebSentinel` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
}
export function downloadReport(scan: Scan, format: 'json' | 'csv' = 'json') {
  const content = format === 'json' ? JSON.stringify({ demo: true, notice: 'Illustrative demo data. No security scan was performed.', scan, findings: scan.findings ? findings : [] }, null, 2) : 'DEMO DATA — no real scan performed\nID,Target,Status,Findings\n' + `${scan.id},${scan.target},${scan.status},${scan.findings}`;
  const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = `websentinel-demo-${scan.id}.${format}`; a.click(); URL.revokeObjectURL(url);
}
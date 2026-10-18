import { useRef, useState, type FormEvent } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { scannerApi, scanOptions, createScanSchema, activeStatuses } from '@/lib/scanner-api';
import { toApiError } from '@/lib/api-errors';
import { redactEvidence } from '@/lib/evidence';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'WebSentinel · Target scanner' },
    { name: 'description', content: 'Scan an authorized target with your existing backend and review its security findings.' },
    { property: 'og:title', content: 'WebSentinel · Target scanner' },
    { property: 'og:description', content: 'Submit a target URL and review actual scanner findings.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: Scanner,
});
function Scanner() {
  const [target, setTarget] = useState('');
  const [scanId, setScanId] = useState('');
  const [validationError, setValidationError] = useState('');
  const lock = useRef(false);
  const client = useQueryClient();
  const mutation = useMutation({ mutationFn: scannerApi.createScan, retry: false });
  const scanQuery = useQuery({ ...scanOptions(scanId), enabled: Boolean(scanId) });
  const scan = scanQuery.data;
  const busy = mutation.isPending || Boolean(scan && activeStatuses.includes(scan.status) && !scanQuery.isError);
  const error = validationError || (mutation.error ? toApiError(mutation.error).message : '') || (scanQuery.error ? toApiError(scanQuery.error).message : '') || (scan?.status === 'Failed' ? redactEvidence(scan.error || 'The scanner failed. No completed results are available.') : scan?.status === 'Cancelled' ? 'The scan was cancelled by the backend.' : '');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || busy) return;
    setValidationError('');
    const input = createScanSchema.safeParse({ target, profile: 'Standard' });
    if (!input.success) { setValidationError(input.error.issues[0]?.message || 'Enter a valid HTTP or HTTPS URL.'); return; }
    lock.current = true;
    setScanId('');
    mutation.reset();
    try {
      const created = await mutation.mutateAsync(input.data);
      client.setQueryData(['scans', created.id], created);
      setScanId(created.id);
    } catch { /* API errors are displayed below the form. */ }
    finally { lock.current = false; }
  }
  return <main className="minimal-scanner">
    <h1><Shield aria-hidden="true" size={26} />WebSentinel</h1>
    <form onSubmit={submit} noValidate className="scanner-form">
      <div className="scanner-field"><label htmlFor="target-url">Target URL</label>
        <input id="target-url" type="url" placeholder="https://app.example.com" value={target} onChange={event => setTarget(event.target.value)} maxLength={2048} disabled={busy} aria-invalid={Boolean(validationError)} aria-describedby={error ? 'scan-error' : undefined} required />
      </div>
      <Button type="submit" disabled={busy}>Scan Target</Button>
    </form>
    <div aria-live="polite" className="scanner-state">
      {busy && <p role="status">Scanning target…</p>}
      {error && <p id="scan-error" role="alert" className="scanner-error">{error}</p>}
    </div>
    {scan?.status === 'Completed' && !scanQuery.isError && <section className="scanner-results" aria-label="Scan findings">
      {scan.results.length === 0 ? <p className="scanner-empty">The scanner returned no findings.</p> : scan.results.map(finding => <article className="scanner-finding" key={finding.id}>
        {(finding.title != null || finding.severity != null) && <header>
          {finding.title != null && <h2>{redactEvidence(finding.title)}</h2>}
          {finding.severity && <span className={`scanner-severity severity-${finding.severity.toLowerCase()}`}>{finding.severity === 'Info' ? 'Informational' : finding.severity}</span>}
        </header>}
        {finding.affectedUrl != null && <div className="scanner-finding-field"><h3>Affected URL</h3><p className="scanner-endpoint">{redactEvidence(finding.affectedUrl)}</p></div>}
        {finding.description != null && <div className="scanner-finding-field"><h3>Description</h3><p>{redactEvidence(finding.description)}</p></div>}
        {finding.evidence != null && <div className="scanner-finding-field"><h3>Evidence</h3><pre>{redactEvidence(finding.evidence)}</pre></div>}
        {finding.remediation != null && <div className="scanner-finding-field"><h3>Remediation</h3><p>{redactEvidence(finding.remediation)}</p></div>}
      </article>)}
    </section>}
  </main>;
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Download, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

interface Receipt {
  id: string;
  amount: string;
  currency: string;
  status: string;
  type: string;
  method: string;
  description: string | null;
  date: string;
  orderId: string | null;
  customerEmail: string | null;
  merchant: { name: string; supportEmail: string | null; logoUrl: string | null; primaryColor: string | null };
  descriptor: string | null;
}

const PROJECT_ID =
  (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? 'sprjfzeyyihtfvxnfuhb';
const FN_BASE = `https://${PROJECT_ID}.supabase.co/functions/v1`;

/**
 * Public, unauthenticated receipt page. Renders a sanitized snapshot of a
 * completed transaction (the same data that ships in the receipt email).
 * The .pdf URL embedded in emails points at the render-receipt-pdf edge
 * function — this page is the human-friendly HTML view.
 */
export default function Receipt() {
  const { id = '' } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = `Receipt · ${id.slice(0, 8) || ''}`;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${FN_BASE}/public-receipt?id=${encodeURIComponent(id)}`);
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error || `Receipt not available (${r.status})`);
        }
        const data = (await r.json()) as Receipt;
        if (!cancelled) setReceipt(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load receipt');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const pdfUrl = `${FN_BASE}/render-receipt-pdf?id=${encodeURIComponent(id)}`;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">Receipt unavailable</h1>
          <p className="text-sm text-muted-foreground">{error || 'This receipt could not be found.'}</p>
        </div>
      </div>
    );
  }

  const rows: Array<[string, string | null]> = [
    ['Order ID', receipt.orderId || receipt.id],
    ['Type', receipt.type],
    ['Amount', `${receipt.amount} ${receipt.currency}`],
    ['Date', receipt.date],
    ['Status', receipt.status],
    ['Method', receipt.method],
    ['Description', receipt.description],
    ['Statement descriptor', receipt.descriptor],
  ];

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <main className="max-w-xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-lg font-semibold text-foreground">{receipt.merchant.name}</h1>
          <p className="text-sm text-muted-foreground">Payment receipt</p>
        </header>

        <article className="rounded-xl border border-border bg-card shadow-sm p-6 space-y-5">
          <div className="rounded-md bg-muted px-3 py-2 text-center font-mono text-xs text-foreground break-all">
            # {receipt.id}
          </div>

          <dl className="rounded-lg border border-border divide-y divide-border">
            {rows.filter(([, v]) => !!v).map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                <dt className="font-medium text-foreground">{label}</dt>
                <dd className="text-right text-muted-foreground break-all">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={pdfUrl}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/70"
            >
              <Download className="h-4 w-4" /> Save as PDF
            </a>
            <button
              onClick={copyLink}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/70"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <LinkIcon className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>

          {receipt.descriptor && (
            <p className="text-xs text-muted-foreground bg-muted/60 border border-border rounded-md p-3 text-center leading-relaxed">
              This charge will appear on your statement as{' '}
              <strong className="font-mono text-foreground">{receipt.descriptor}</strong>
              {receipt.merchant.supportEmail && (
                <> . If you don't recognise it, email{' '}
                  <a className="underline" href={`mailto:${receipt.merchant.supportEmail}`}>
                    {receipt.merchant.supportEmail}
                  </a>{' '}before disputing.</>
              )}
            </p>
          )}
        </article>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Issued by {receipt.merchant.name} · MZZPay
        </p>
      </main>
    </div>
  );
}

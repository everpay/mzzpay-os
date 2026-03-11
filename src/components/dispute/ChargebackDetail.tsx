import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Send, FileText, Globe, Monitor, Mail, MapPin, Package, CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { mockChargebacks, mockEvidence, mockDisputes } from '@/lib/dispute-mock-data';
import { format } from 'date-fns';
import { EvidenceType } from '@/lib/dispute-types';

const evidenceIcons: Record<EvidenceType, React.ComponentType<{ className?: string }>> = {
  payment_details: CreditCard,
  avs_cvv: ShieldCheck,
  ip_address: Globe,
  device_fingerprint: Monitor,
  billing_address: MapPin,
  shipping_address: MapPin,
  customer_email: Mail,
  order_metadata: FileText,
  transaction_receipt: FileText,
  delivery_confirmation: Package,
  refund_history: FileText,
  merchant_terms: FileText,
  custom: FileText,
};

const evidenceLabels: Record<EvidenceType, string> = {
  payment_details: 'Payment Details',
  avs_cvv: 'AVS/CVV Check',
  ip_address: 'IP Address',
  device_fingerprint: 'Device Fingerprint',
  billing_address: 'Billing Address',
  shipping_address: 'Shipping Address',
  customer_email: 'Customer Email',
  order_metadata: 'Order Metadata',
  transaction_receipt: 'Transaction Receipt',
  delivery_confirmation: 'Delivery Confirmation',
  refund_history: 'Refund History',
  merchant_terms: 'Merchant Terms',
  custom: 'Custom Evidence',
};

export function ChargebackDetail({ mode }: { mode: 'merchant' | 'admin' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const chargeback = mockChargebacks.find(cb => cb.id === id);
  const evidence = mockEvidence.filter(ev => ev.chargeback_id === id);
  const dispute = mockDisputes.find(d => d.chargeback_id === id);

  if (!chargeback) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Chargeback not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const backPath = mode === 'merchant' ? '/merchant/disputes' : '/admin/disputes';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Dispute {chargeback.id.slice(-8)}</h1>
            <StatusBadge status={chargeback.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Created {format(new Date(chargeback.created_at), 'MMM d, yyyy · HH:mm')}
          </p>
        </div>
        {chargeback.status === 'evidence_collected' && (
          <Button className="gap-2">
            <Send className="w-3.5 h-3.5" />
            Submit Dispute
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Chargeback Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Payment ID</dt>
                  <dd className="font-mono mt-0.5 text-foreground">{chargeback.payment_id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Amount</dt>
                  <dd className="font-semibold mt-0.5 text-foreground">
                    {new Intl.NumberFormat('en', { style: 'currency', currency: chargeback.currency }).format(chargeback.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Processor</dt>
                  <dd className="mt-0.5 text-foreground">{chargeback.processor_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Reason Code</dt>
                  <dd className="mt-0.5 text-foreground">{chargeback.reason_code} — {chargeback.reason_description}</dd>
                </div>
                {mode === 'admin' && (
                  <div>
                    <dt className="text-muted-foreground text-xs">Merchant</dt>
                    <dd className="mt-0.5 text-foreground">{chargeback.merchant_name}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Evidence Collected</CardTitle>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Upload className="w-3 h-3" />
                Upload
              </Button>
            </CardHeader>
            <CardContent>
              {evidence.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No evidence collected yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {evidence.map((ev) => {
                    const Icon = evidenceIcons[ev.evidence_type] || FileText;
                    return (
                      <div key={ev.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                        <div className="p-1.5 rounded bg-card">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{evidenceLabels[ev.evidence_type]}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {Object.entries(ev.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                          </p>
                        </div>
                        {ev.file_url && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">PDF</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {dispute && (
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Win Probability</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center py-4">
                <div className="relative w-24 h-24 mb-3">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                    <path className="text-muted" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <path
                      className={dispute.evidence_score >= 70 ? 'text-success' : dispute.evidence_score >= 40 ? 'text-warning' : 'text-destructive'}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeDasharray={`${dispute.evidence_score}, 100`} strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-foreground">{dispute.evidence_score}</span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {dispute.evidence_score >= 70 ? 'Strong case' : dispute.evidence_score >= 40 ? 'Moderate case' : 'Weak case'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dispute.evidence_score < 40 ? 'Consider accepting this chargeback' : 'Recommended to dispute'}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <TimelineItem label="Chargeback received" date={chargeback.created_at} active />
                <TimelineItem
                  label="Evidence collected"
                  date={dispute?.created_at}
                  active={['evidence_collected', 'submitted', 'under_review', 'won', 'lost'].includes(chargeback.status)}
                />
                <TimelineItem
                  label="Dispute submitted"
                  date={dispute?.submitted_at ?? undefined}
                  active={['submitted', 'under_review', 'won', 'lost'].includes(chargeback.status)}
                />
                <TimelineItem
                  label="Resolution"
                  active={['won', 'lost'].includes(chargeback.status)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, date, active }: { label: string; date?: string; active?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${active ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
      <div>
        <p className={`text-sm ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</p>
        {date && <p className="text-xs text-muted-foreground">{format(new Date(date), 'MMM d, HH:mm')}</p>}
      </div>
    </div>
  );
}
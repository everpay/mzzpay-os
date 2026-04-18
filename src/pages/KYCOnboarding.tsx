import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, Upload, FileText, Shield } from 'lucide-react';
import { toast } from 'sonner';

const REQUIRED_DOCS = [
  { type: 'business_registration', label: 'Business Registration' },
  { type: 'tax_id', label: 'Tax ID / EIN' },
  { type: 'bank_statement', label: 'Recent Bank Statement' },
  { type: 'owner_id', label: 'Owner ID (Passport / Driver\'s License)' },
  { type: 'proof_of_address', label: 'Proof of Address' },
];

export default function KYCOnboarding() {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: docs = [], refetch } = useQuery({
    queryKey: ['kyc-docs'], enabled: !!user,
    queryFn: async () => {
      const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user!.id).single();
      if (!m) return [];
      const { data } = await supabase.from('kyc_documents').select('*').eq('merchant_id', m.id);
      return data || [];
    },
  });

  const submit = async (type: string) => {
    if (!user) return;
    setBusy(type);
    const { data: m } = await supabase.from('merchants').select('id').eq('user_id', user.id).single();
    if (!m) { setBusy(null); return; }
    // Placeholder file URL — real implementation would upload to storage first
    const { error } = await supabase.from('kyc_documents').insert({
      merchant_id: m.id, document_type: type, file_url: 'pending-upload', status: 'pending_review',
    });
    setBusy(null);
    if (error) toast.error(error.message); else { toast.success('Document submitted'); refetch(); }
  };

  const completed = docs.filter(d => d.status === 'approved').length;
  const progress = (completed / REQUIRED_DOCS.length) * 100;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" />KYC Onboarding</h1><p className="text-sm text-muted-foreground mt-1">Verify your business to unlock higher limits and faster payouts</p></div>
        <Card>
          <CardHeader><CardTitle>Verification Progress</CardTitle><CardDescription>{completed} of {REQUIRED_DOCS.length} documents approved</CardDescription></CardHeader>
          <CardContent><Progress value={progress} className="h-2" /></CardContent>
        </Card>
        <div className="space-y-3">
          {REQUIRED_DOCS.map(req => {
            const doc = docs.find(d => d.document_type === req.type);
            const status = doc?.status || 'not_submitted';
            return (
              <Card key={req.type}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-medium">{req.label}</p>
                      <p className="text-xs text-muted-foreground">{status === 'approved' ? 'Approved' : status === 'pending_review' ? 'Under review' : status === 'rejected' ? 'Rejected — please resubmit' : 'Not submitted'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {status === 'approved' && <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>}
                    {status === 'pending_review' && <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                    {status === 'rejected' && <Badge variant="destructive">Rejected</Badge>}
                    {(status === 'not_submitted' || status === 'rejected') && <Button size="sm" className="rounded-full" onClick={() => submit(req.type)} disabled={busy === req.type}><Upload className="h-4 w-4 mr-1" />{busy === req.type ? 'Submitting...' : 'Submit'}</Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

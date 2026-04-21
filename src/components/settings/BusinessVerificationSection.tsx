import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, FileText, CheckCircle2, Clock, AlertCircle, Upload, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CountrySelect } from '@/components/CountrySelect';
import { BUSINESS_TYPES, getIndustryGroups, getMccByIndustry } from '@/data/business-categories';

function useMerchantProfile() {
  return useQuery({
    queryKey: ['merchant-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: merchant } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (!merchant) throw new Error('No merchant found');
      const { data, error } = await supabase
        .from('merchant_profiles' as any)
        .select('*')
        .eq('merchant_id', merchant.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return { profile: data as any, merchantId: merchant.id, merchant: merchant as any };
    },
  });
}

export function BusinessVerificationSection() {
  const { data, refetch } = useMerchantProfile();
  const profile = data?.profile;
  const merchantId = data?.merchantId;
  const merchant = data?.merchant;

  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [mccCode, setMccCode] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [documents, setDocuments] = useState<{ name: string; path: string }[]>([]);

  // Prefill from merchant (signup data) and merchant_profiles
  useEffect(() => {
    // Prefer profile data; fall back to merchant signup data so users see what they entered.
    if (merchant) {
      setBusinessName((profile?.business_name) || merchant.name || '');
      setWebsite(profile?.website || (merchant.website_urls?.[0] ?? ''));
    }
    if (profile) {
      setBusinessType(profile.business_type || '');
      setRegistrationNumber(profile.registration_number || '');
      setTaxId(profile.tax_id || '');
      setCountry(profile.country || '');
      setIndustry(profile.industry || '');
      setMccCode(profile.mcc_code || '');
      const addr = profile.address as any;
      if (addr) {
        setStreet(addr.street || '');
        setCity(addr.city || '');
        setStateRegion(addr.state || '');
        setPostalCode(addr.postal_code || '');
      }
    }
  }, [profile, merchant]);

  useEffect(() => {
    const loadDocs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: files } = await supabase.storage.from('kyb-documents').list(user.id);
      if (files) setDocuments(files.map((f) => ({ name: f.name, path: `${user.id}/${f.name}` })));
    };
    loadDocs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId) return;
    setIsSaving(true);
    try {
      const profileData: any = {
        merchant_id: merchantId,
        business_name: businessName,
        business_type: businessType,
        registration_number: registrationNumber,
        tax_id: taxId,
        country,
        website,
        industry,
        mcc_code: mccCode,
        address: { street, city, state: stateRegion, postal_code: postalCode },
        onboarding_status: profile ? profile.onboarding_status : 'in_review',
      };

      if (profile) {
        const { error } = await supabase.from('merchant_profiles' as any).update(profileData).eq('id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('merchant_profiles' as any).insert(profileData);
        if (error) throw error;
      }
      toast.success('Business profile saved');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('kyb-documents').upload(path, file);
      if (error) throw error;
      setDocuments((prev) => [...prev, { name: file.name, path }]);
      toast.success('Document uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'in_review':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />In Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Business Verification (KYB)</h3>
          <p className="text-sm text-muted-foreground">Complete your KYB onboarding to activate full payment processing</p>
        </div>
        {profile && getStatusBadge(profile.onboarding_status)}
      </div>

      {/* Progress Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {['Business Profile', 'Documents', 'Verification', 'Activation'].map((step, i) => {
          const completed = profile?.onboarding_status === 'approved' || (profile && i < 2);
          const active = !profile ? i === 0 : profile.onboarding_status === 'in_review' ? i === 2 : i === 0;
          return (
            <div
              key={step}
              className={`rounded-lg border p-3 text-center text-xs font-medium transition-colors ${
                completed
                  ? 'bg-success/10 border-success/20 text-success'
                  : active
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              <div className="text-lg mb-1">{completed ? '✓' : i + 1}</div>
              {step}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSave}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Business Information</CardTitle>
                <CardDescription>Provide your business details for verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Legal Business Name</Label>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Acme Inc." required />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Type</Label>
                    <Select value={businessType} onValueChange={setBusinessType}>
                      <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="12-3456789" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax ID / EIN</Label>
                    <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="XX-XXXXXXX" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Select
                      value={industry}
                      onValueChange={(v) => {
                        setIndustry(v);
                        const mcc = getMccByIndustry(v);
                        if (mcc) setMccCode(mcc);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select industry..." /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(getIndustryGroups()).map(([group, items]) => (
                          <div key={group}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group}</div>
                            {items.map((i) => (
                              <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>MCC Code</Label>
                    <Input value={mccCode} onChange={(e) => setMccCode(e.target.value)} placeholder="5411" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <CountrySelect value={country} onValueChange={setCountry} />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://example.com" type="url" />
                  </div>
                </div>
                <div className="pt-2">
                  <Label className="text-sm font-semibold mb-3 block">Business Address</Label>
                  <div className="space-y-3">
                    <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street address" />
                    <div className="grid grid-cols-3 gap-3">
                      <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                      <Input value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} placeholder="State" />
                      <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal code" />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Business Profile'}
                </Button>
              </CardContent>
            </Card>
          </form>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Verification Documents</CardTitle>
              <CardDescription>Upload required documents for KYB verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {['Business Registration', 'Government ID', 'Bank Verification', 'Tax Certificate'].map((docType) => {
                  const uploaded = documents.some((d) =>
                    d.name.toLowerCase().includes(docType.toLowerCase().replace(/ /g, '_'))
                  );
                  return (
                    <div
                      key={docType}
                      className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
                        uploaded ? 'border-success/20 bg-success/5' : 'border-border'
                      }`}
                    >
                      <span className={uploaded ? 'text-success' : 'text-muted-foreground'}>{docType}</span>
                      {uploaded ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Drop files or click to upload</p>
                <input
                  type="file"
                  onChange={handleDocUpload}
                  className="hidden"
                  id="doc-upload-settings"
                  accept=".pdf,.jpg,.png,.jpeg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('doc-upload-settings')?.click()}
                  disabled={uploadingDoc}
                >
                  {uploadingDoc ? 'Uploading...' : 'Choose File'}
                </Button>
              </div>
              {documents.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Uploaded Files</p>
                  {documents.map((doc) => (
                    <div key={doc.path} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Compliance Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Identity Verification', done: profile?.kyb_verified_at },
                { label: 'Sanctions Screening', done: profile?.onboarding_status === 'approved' },
                { label: 'Risk Assessment', done: profile?.onboarding_status === 'approved' },
              ].map((check) => (
                <div key={check.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{check.label}</span>
                  {check.done ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

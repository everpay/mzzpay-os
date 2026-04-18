import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon,
  Webhook,
  Key,
  Building2,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Copy,
  ChevronRight,
  ArrowLeft,
  User,
  Lock,
  Globe,
  Phone,
  Mail,
  Plus,
  X,
  AlertTriangle,
  Zap,
  Code,
  ExternalLink,
  RefreshCw,
  Hash,
  MapPin,
  FileText,
  Users,
  UserPlus,
  Shield,
} from "lucide-react";
import { useProviderEvents } from "@/hooks/useProviderEvents";
import { formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { WebhooksSection as WebhooksSectionComponent } from "@/components/settings/WebhooksSection";
import { BusinessVerificationSection as BusinessVerificationSectionComponent } from "@/components/settings/BusinessVerificationSection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CountrySelect } from "@/components/CountrySelect";

type SettingsSection =
  | "main"
  | "account"
  | "business"
  | "bank-accounts"
  | "developers"
  | "team"
  | "webhooks"
  | "verification"
  | "deactivation";

type TeamRole = "admin" | "reseller" | "developer" | "compliance_officer" | "support" | "agent" | "employee";

const TEAM_ROLES: { value: TeamRole; label: string }[] = [
  { value: "admin", label: "Admin — Full dashboard access" },
  { value: "reseller", label: "Reseller — Partner portal access" },
  { value: "developer", label: "Developer — API & integrations" },
  { value: "compliance_officer", label: "Compliance Officer — KYB & disputes" },
  { value: "support", label: "Support — Customer assistance" },
  { value: "agent", label: "Agent — Limited operational access" },
  { value: "employee", label: "Employee — Read-only baseline" },
];

const RESEND_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

interface TeamInvitation {
  id: string;
  email: string;
  full_name: string | null;
  role: TeamRole;
  status: "pending" | "accepted" | "revoked";
  last_sent_at: string;
  created_at: string;
}

interface SavedBankAccount {
  id: string;
  nickname: string | null;
  account_holder_name: string;
  institution_number: string;
  transit_number: string;
  account_last4: string;
  currency: string;
  is_default: boolean;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<SettingsSection>("main");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [businessCurrency, setBusinessCurrency] = useState("USD");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [businessPostalCode, setBusinessPostalCode] = useState("");
  const [businessCountry, setBusinessCountry] = useState("");
  const [companyRegNumber, setCompanyRegNumber] = useState("");
  const [taxId, setTaxId] = useState("");
  const [websiteUrls, setWebsiteUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");

  const [webhookUrl, setWebhookUrl] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [livePublicKey, setLivePublicKey] = useState("");
  const [liveSecretKey, setLiveSecretKey] = useState("");

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("admin");
  const [isInviting, setIsInviting] = useState(false);

  const [testPublicKey, setTestPublicKey] = useState("");
  const [testSecretKey, setTestSecretKey] = useState("");
  const [showTestPublicKey, setShowTestPublicKey] = useState(false);
  const [showTestSecretKey, setShowTestSecretKey] = useState(false);

  const { data: merchant } = useQuery({
    queryKey: ["merchant-settings"],
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("merchants").select("*").eq("user_id", u.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: savedBankAccounts = [] } = useQuery({
    queryKey: ["saved-bank-accounts"],
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) throw new Error("Not authenticated");
      const { data: m } = await supabase.from("merchants").select("id").eq("user_id", u.id).single();
      if (!m) throw new Error("Merchant not found");
      const { data, error } = await supabase
        .from("saved_bank_accounts")
        .select("*")
        .eq("merchant_id", m.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedBankAccount[];
    },
  });

  useEffect(() => {
    if (merchant) {
      setBusinessName(merchant.name || "");
      setContactEmail(user?.email || "");
      setWebhookUrl(merchant.webhook_url || "");
      if (merchant.id) {
        setLivePublicKey(`mzz_pk_live_${merchant.id.replace(/-/g, "").slice(0, 24)}`);
        setLiveSecretKey(merchant.api_key_hash || "");
        setTestPublicKey(localStorage.getItem(`mzz_test_pk_${merchant.id}`) || "");
        setTestSecretKey(localStorage.getItem(`mzz_test_sk_${merchant.id}`) || "");
      }
    }
  }, [merchant, user]);

  const saveAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("merchants")
        .update({ name: contactName } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account details saved");
      queryClient.invalidateQueries({ queryKey: ["merchant-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const saveBusiness = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("merchants")
        .update({ name: businessName } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business details saved");
      queryClient.invalidateQueries({ queryKey: ["merchant-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update password"),
  });

  const updateWebhook = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase.from("merchants").update({ webhook_url: url }).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Webhook URL updated");
      queryClient.invalidateQueries({ queryKey: ["merchant-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update webhook"),
  });

  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_bank_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bank account removed");
      queryClient.invalidateQueries({ queryKey: ["saved-bank-accounts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast.success("Your account has been deactivated. Payment records are preserved for compliance.");
      await signOut();
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const addUrl = () => {
    if (!newUrl.trim()) return;
    setWebsiteUrls([...websiteUrls, newUrl.trim()]);
    setNewUrl("");
  };

  const removeUrl = (index: number) => {
    setWebsiteUrls(websiteUrls.filter((_, i) => i !== index));
  };

  const generateApiKey = async (type: "public" | "secret") => {
    const prefix = type === "public" ? "evp_pk_live_" : "evp_sk_live_";
    const newKey = `${prefix}${crypto.randomUUID().replace(/-/g, "")}`;
    if (type === "secret") {
      const { error } = await supabase
        .from("merchants")
        .update({ api_key_hash: newKey } as any)
        .eq("user_id", user!.id);
      if (error) {
        toast.error("Failed to generate key");
        return;
      }
      setLiveSecretKey(newKey);
      queryClient.invalidateQueries({ queryKey: ["merchant-settings"] });
    } else {
      setLivePublicKey(newKey);
    }
    navigator.clipboard.writeText(newKey);
    toast.success(`New ${type} key generated and copied to clipboard. Store it securely!`);
  };

  const menuItems: {
    key: SettingsSection;
    label: string;
    icon: React.ElementType;
    destructive?: boolean;
    link?: string;
  }[] = [
    { key: "account", label: "Account Details", icon: User },
    { key: "business", label: "Business Details", icon: Building2 },
    { key: "bank-accounts", label: "Bank Accounts", icon: Building2 },
    { key: "verification", label: "Business Verification", icon: Shield },
    { key: "webhooks", label: "Webhooks", icon: Webhook },
    { key: "team", label: "Members", icon: Users },
    { key: "developers", label: "Developers & Activity", icon: Code },
    { key: "processor-routing" as any, label: "Processor Routing", icon: Globe, link: "/processor-transparency" },
    { key: "multi-acquirer" as any, label: "Multi-Acquirer", icon: Globe, link: "/multi-acquirer" },
    { key: "smart-retry" as any, label: "Smart Retry AI", icon: Zap, link: "/smart-retry" },
    { key: "deactivation", label: "Close Account", icon: AlertTriangle, destructive: true },
  ];

  if (section === "main") {
    return (
      <AppLayout>
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit your business information and adjust your settings.</p>
        </div>
        <Card className="max-w-lg">
          <CardContent className="p-0">
            {menuItems.map((item, i) => (
              <button
                key={item.key}
                onClick={() => (item.link ? navigate(item.link) : setSection(item.key))}
                className={`flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-medium hover:bg-muted/50 transition-colors ${
                  item.destructive ? "text-destructive" : "text-foreground"
                } ${i < menuItems.length - 1 ? "border-b border-border" : ""}`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <button
          onClick={() => setSection("main")}
          className="flex items-center gap-1 text-sm text-primary hover:underline mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {section === "account" && (
        <div className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Manage your personal account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="pl-9" placeholder="Your full name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="pl-9" placeholder="you@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="pl-9" placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select value={businessCurrency} onValueChange={setBusinessCurrency}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD – United States Dollar</SelectItem>
                    <SelectItem value="CAD">CAD – Canadian Dollar</SelectItem>
                    <SelectItem value="EUR">EUR – Euro</SelectItem>
                    <SelectItem value="GBP">GBP – British Pound</SelectItem>
                    <SelectItem value="BRL">BRL – Brazilian Real</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => saveAccount.mutate()} disabled={saveAccount.isPending}>
                <Save className="h-4 w-4 mr-2" /> {saveAccount.isPending ? "Saving..." : "Save Account"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Toggle between light and dark mode.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">Switch between dark and light mode</p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" /> Change Password
              </CardTitle>
              <CardDescription>Update your account password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-9" placeholder="New password" minLength={6} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-9" placeholder="Confirm password" minLength={6} />
                </div>
              </div>
              <Button onClick={() => changePassword.mutate()} disabled={changePassword.isPending}>
                <Save className="h-4 w-4 mr-2" /> {changePassword.isPending ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "business" && (
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
              <CardDescription>Complete your Know Your Business (KYB) information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Legal Business Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="pl-9" placeholder="Acme Corp Ltd." />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Registration No.</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={companyRegNumber} onChange={(e) => setCompanyRegNumber(e.target.value)} className="pl-9" placeholder="e.g. 12345678" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tax ID / VAT Number</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="pl-9" placeholder="e.g. GB123456789" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="pl-9" placeholder="info@business.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Business Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="tel" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} className="pl-9" placeholder="+1 (555) 000-0000" />
                  </div>
                </div>
              </div>

              <Separator />
              <h4 className="text-sm font-semibold text-foreground">Business Address</h4>
              <div className="space-y-2">
                <Label>Street Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} className="pl-9" placeholder="123 Business Ave, Suite 100" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={businessCity} onChange={(e) => setBusinessCity(e.target.value)} placeholder="City" />
                </div>
                <div className="space-y-2">
                  <Label>State/Province</Label>
                  <Input value={businessState} onChange={(e) => setBusinessState(e.target.value)} placeholder="State" />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code</Label>
                  <Input value={businessPostalCode} onChange={(e) => setBusinessPostalCode(e.target.value)} placeholder="Postal" />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <CountrySelect value={businessCountry} onValueChange={setBusinessCountry} />
                </div>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label>Website URLs</Label>
                <div className="space-y-2">
                  {websiteUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={url} readOnly className="pl-9 bg-muted" />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeUrl(i)}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="pl-9" placeholder="https://example.com" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())} />
                    </div>
                    <Button variant="outline" size="icon" onClick={addUrl}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button onClick={() => saveBusiness.mutate()} disabled={saveBusiness.isPending}>
                <Save className="h-4 w-4 mr-2" /> {saveBusiness.isPending ? "Saving..." : "Save Business Details"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "bank-accounts" && (
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Saved Bank Accounts
              </CardTitle>
              <CardDescription>Manage your saved bank accounts for quick payouts.</CardDescription>
            </CardHeader>
            <CardContent>
              {savedBankAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No saved bank accounts</p>
                  <p className="text-sm">Bank accounts are saved automatically when you make a payout</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedBankAccounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {account.nickname || account.account_holder_name}
                            {account.is_default && (
                              <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">•••• {account.account_last4} • {account.currency}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteBankAccount.mutate(account.id)} disabled={deleteBankAccount.isPending}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {section === "developers" && (
        <div className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" /> API Keys
                  </CardTitle>
                  <CardDescription>Manage your API keys for programmatic access.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/docs")} className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> API Docs
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Account ID</Label>
                <div className="flex gap-2">
                  <Input value={merchant?.id || ""} readOnly className="flex-1 font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(merchant?.id || ""); toast.success("Account ID copied"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Publishable Key</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input type={showApiKey ? "text" : "password"} value={livePublicKey || "No key generated"} readOnly className="pr-10 font-mono text-xs" />
                    <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(livePublicKey); toast.success("Copied"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => generateApiKey("public")} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Rotate
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Secret Key</Label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input type={showSecretKey ? "text" : "password"} value={liveSecretKey || "No key generated"} readOnly className="pr-10 font-mono text-xs" />
                    <button type="button" onClick={() => setShowSecretKey(!showSecretKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(liveSecretKey); toast.success("Copied"); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => generateApiKey("secret")} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> {liveSecretKey ? "Rotate" : "Generate"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Keep your secret key secure. Do not share it in public repositories.</p>
              </div>

              <Separator />

              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">TEST MODE</Badge>
                  <p className="text-xs text-muted-foreground">Use these keys in sandbox/test environments. They never charge real cards.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Test Publishable Key</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input type={showTestPublicKey ? "text" : "password"} value={testPublicKey || "No test key generated"} readOnly className="pr-10 font-mono text-xs" />
                      <button type="button" onClick={() => setShowTestPublicKey(!showTestPublicKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showTestPublicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(testPublicKey); toast.success("Copied"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => {
                      const k = `mzz_pk_test_${crypto.randomUUID().replace(/-/g, "")}`;
                      setTestPublicKey(k);
                      localStorage.setItem(`mzz_test_pk_${merchant?.id}`, k);
                      navigator.clipboard.writeText(k);
                      toast.success("Test publishable key generated and copied");
                    }} className="gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" /> {testPublicKey ? "Rotate" : "Generate"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Test Secret Key</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input type={showTestSecretKey ? "text" : "password"} value={testSecretKey || "No test key generated"} readOnly className="pr-10 font-mono text-xs" />
                      <button type="button" onClick={() => setShowTestSecretKey(!showTestSecretKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showTestSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(testSecretKey); toast.success("Copied"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => {
                      const k = `mzz_sk_test_${crypto.randomUUID().replace(/-/g, "")}`;
                      setTestSecretKey(k);
                      localStorage.setItem(`mzz_test_sk_${merchant?.id}`, k);
                      navigator.clipboard.writeText(k);
                      toast.success("Test secret key generated and copied");
                    }} className="gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" /> {testSecretKey ? "Rotate" : "Generate"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" /> Webhook Configuration
              </CardTitle>
              <CardDescription>Configure your webhook URL to receive payment notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input type="url" placeholder="https://your-domain.com/api/webhooks" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="flex-1" />
                  <Button onClick={() => updateWebhook.mutate(webhookUrl)} disabled={updateWebhook.isPending}>
                    <Save className="h-4 w-4 mr-2" /> {updateWebhook.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h4 className="font-medium text-sm mb-2">Webhook Events</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">payment_link.completed</Badge>
                  <Badge variant="outline">payment_link.failed</Badge>
                  <Badge variant="outline">payment_link.expired</Badge>
                  <Badge variant="outline">moneto.payment.succeeded</Badge>
                  <Badge variant="outline">moneto.payout.completed</Badge>
                  <Badge variant="outline">invoice.paid</Badge>
                  <Badge variant="outline">invoice.overdue</Badge>
                  <Badge variant="outline">dispute.created</Badge>
                  <Badge variant="outline">subscription.renewed</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <DevelopersSection />
        </div>
      )}

      {section === "team" && (
        <div className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> Invite Member
              </CardTitle>
              <CardDescription>Send an invitation to add a new member to your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={inviteFullName} onChange={(e) => setInviteFullName(e.target.value)} className="pl-9" placeholder="John Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="pl-9" placeholder="colleague@company.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as TeamRole)}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={async () => {
                  if (!inviteEmail) { toast.error("Email is required"); return; }
                  if (!merchant?.id) { toast.error("Merchant not loaded"); return; }
                  setIsInviting(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("invite-admin", {
                      body: { email: inviteEmail, fullName: inviteFullName, role: inviteRole },
                    });
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    await supabase.from("team_invitations" as any).upsert({
                      merchant_id: merchant.id,
                      invited_by: user!.id,
                      email: inviteEmail.toLowerCase(),
                      full_name: inviteFullName || null,
                      role: inviteRole,
                      status: "pending",
                      last_sent_at: new Date().toISOString(),
                    }, { onConflict: "merchant_id,email" } as any);
                    toast.success(`Invitation sent to ${inviteEmail}`);
                    setInviteEmail("");
                    setInviteFullName("");
                    setInviteRole("admin");
                    queryClient.invalidateQueries({ queryKey: ["team-invitations"] });
                  } catch (err: any) {
                    toast.error(err.message || "Failed to send invitation");
                  } finally {
                    setIsInviting(false);
                  }
                }}
                disabled={isInviting || !inviteEmail}
              >
                <UserPlus className="h-4 w-4 mr-2" /> {isInviting ? "Sending..." : "Send Invitation"}
              </Button>
            </CardContent>
          </Card>

          <TeamInvitationsList merchantId={merchant?.id} />
        </div>
      )}

      {section === "webhooks" && <WebhooksSectionComponent />}

      {section === "verification" && <BusinessVerificationSectionComponent />}

      {section === "deactivation" && (
        <div className="max-w-2xl">
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Deactivate Account
              </CardTitle>
              <CardDescription>Permanently delete your account. This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
                <h4 className="font-medium text-sm">What happens when you delete your account:</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li>Your login credentials and profile will be permanently removed</li>
                  <li>Your merchant profile and business settings will be deleted</li>
                  <li>You will lose access to the dashboard immediately</li>
                </ul>
                <h4 className="font-medium text-sm mt-3">What is preserved for compliance:</h4>
                <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li>Transaction records and payment history</li>
                  <li>Invoice records</li>
                  <li>Dispute and chargeback records</li>
                  <li>Ledger entries</li>
                </ul>
              </div>

              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" /> Delete My Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-destructive">Confirm Account Deletion</DialogTitle>
                    <DialogDescription>
                      This will permanently delete your account. Your payment data will be preserved for regulatory compliance. Type <strong>DELETE</strong> to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <Input placeholder="Type DELETE to confirm" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} className="mt-2" />
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleteConfirmText !== "DELETE" || isDeleting}>
                      {isDeleting ? "Deleting..." : "Permanently Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}

function DevelopersSection() {
  const { data: events = [], isLoading } = useProviderEvents();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" /> Activity Log
        </CardTitle>
        <CardDescription>Provider webhook events and system activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground text-sm">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center p-8 rounded-lg border border-border bg-muted/30">
            <p className="text-muted-foreground text-sm">No events yet</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border max-h-[400px] overflow-y-auto">
            {events.map((event) => (
              <div key={event.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{event.event_type}</span>
                    <Badge variant="outline" className="text-[10px]">{event.provider}</Badge>
                  </div>
                  {event.transaction_id && (
                    <span className="font-mono text-xs text-muted-foreground">{event.transaction_id}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(event.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

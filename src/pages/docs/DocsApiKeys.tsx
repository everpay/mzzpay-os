import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Copy, Check, Plus, RotateCcw, Trash2, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  key: string;
  type: "publishable" | "secret";
  env: "sandbox" | "production";
  created: string;
}

const demoKeys: ApiKey[] = [
  { id: "1", name: "Default", prefix: "pk_test_", key: "pk_test_51NxBz2K8dF9m3Xp7wQrYhJv", type: "publishable", env: "sandbox", created: "2026-02-15" },
  { id: "2", name: "Default", prefix: "sk_test_", key: "sk_test_••••••••••••••••••••••••", type: "secret", env: "sandbox", created: "2026-02-15" },
  { id: "3", name: "Mobile App", prefix: "pk_test_", key: "pk_test_73Yd5n8F1hK2j6Lm4xRtWsAe", type: "publishable", env: "sandbox", created: "2026-03-01" },
];

export default function DocsApiKeys() {
  const { user } = useAuth();
  const [keys] = useState<ApiKey[]>(demoKeys);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleReveal = (id: string) => setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(id);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(null), 2000);
  };

  const maskKey = (key: string) => key.substring(0, 12) + "•".repeat(16);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Badge variant="secondary" className="mb-3">API Keys</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Sandbox Keys</h1>
          <p className="text-muted-foreground mt-2">
            {user ? "Your API keys for testing and development." : "Sign in to view your real keys. Demo keys shown below."}
          </p>
        </div>
        {user && <Button className="gap-2"><Plus className="w-4 h-4" /> Create Key</Button>}
      </div>

      {!user && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <LogIn className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Sign in to access your API keys</p>
              <p className="text-xs text-muted-foreground">The keys below are for demonstration only.</p>
            </div>
            <Link to="/login">
              <Button size="sm" variant="default">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="default" size="sm">Sandbox</Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground">Production</Button>
      </div>

      <div className="space-y-4">
        {keys.map((k) => (
          <Card key={k.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{k.name}</CardTitle>
                  <Badge variant={k.type === "secret" ? "destructive" : "secondary"} className="text-[10px]">
                    {k.type}
                  </Badge>
                  {!user && <Badge variant="outline" className="text-[10px]">demo</Badge>}
                </div>
                <CardDescription className="text-xs">Created {k.created}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={revealed[k.id] ? k.key : maskKey(k.key)}
                  className="font-mono text-xs bg-muted/50"
                />
                <Button variant="ghost" size="icon" onClick={() => toggleReveal(k.id)}>
                  {revealed[k.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => copyKey(k.id, k.key)}>
                  {copied === k.id ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
                {user && (
                  <>
                    <Button variant="ghost" size="icon" className="text-muted-foreground"><RotateCcw className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

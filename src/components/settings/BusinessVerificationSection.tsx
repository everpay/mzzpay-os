import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function BusinessVerificationSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Business Verification
        </CardTitle>
        <CardDescription>Complete your KYB verification to unlock full platform capabilities.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Pending</Badge>
          <span className="text-sm text-muted-foreground">Verification not yet submitted.</span>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook } from "lucide-react";

export function WebhooksSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" /> Webhooks
        </CardTitle>
        <CardDescription>Manage your webhook endpoints and event subscriptions.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">No webhook endpoints configured yet.</p>
      </CardContent>
    </Card>
  );
}

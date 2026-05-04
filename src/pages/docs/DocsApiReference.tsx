import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocsDownloadActions } from "@/components/docs/DocsDownloadActions";
import { OPENAPI_SPEC, buildPostmanCollection } from "@/lib/openapi-spec";
import { Download, FileJson, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function DocsApiReference() {
  const swaggerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load Swagger UI from CDN
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.onload = () => {
      if (swaggerRef.current && (window as any).SwaggerUIBundle) {
        (window as any).SwaggerUIBundle({
          spec: OPENAPI_SPEC,
          domNode: swaggerRef.current,
          deepLinking: true,
          presets: [
            (window as any).SwaggerUIBundle.presets.apis,
            (window as any).SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: "BaseLayout",
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 2,
          docExpansion: "list",
          filter: true,
          tryItOutEnabled: false,
        });
        setLoaded(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  const downloadOpenAPI = () => {
    const blob = new Blob([JSON.stringify(OPENAPI_SPEC, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mzzpay-openapi.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("OpenAPI spec downloaded");
  };

  const downloadPostman = () => {
    const collection = buildPostmanCollection();
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MzzPay.postman_collection.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Postman collection downloaded");
  };

  const copySpec = () => {
    navigator.clipboard.writeText(JSON.stringify(OPENAPI_SPEC, null, 2));
    setCopied(true);
    toast.success("OpenAPI spec copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="secondary" className="mb-3">Interactive</Badge>
          <h1 className="text-3xl font-heading font-bold tracking-tight">API Reference — Swagger UI</h1>
          <p className="text-muted-foreground mt-2">
            Explore every endpoint, request schema, and response format interactively.
            Download the OpenAPI spec or import the Postman collection to start integrating.
          </p>
        </div>
        <DocsDownloadActions />
      </div>

      {/* Download actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={downloadOpenAPI}>
          <FileJson className="h-4 w-4 mr-2" />
          Download OpenAPI JSON
        </Button>
        <Button variant="outline" size="sm" onClick={downloadPostman}>
          <Download className="h-4 w-4 mr-2" />
          Download Postman Collection
        </Button>
        <Button variant="outline" size="sm" onClick={copySpec}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copied!" : "Copy Spec"}
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href="https://editor.swagger.io" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Swagger Editor
          </a>
        </Button>
      </div>

      {/* Quick-start cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">Base URL</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block break-all">https://api.mzzpay.io/v1</code>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">Authentication</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block">Authorization: Bearer sk_live_…</code>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">Idempotency</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block">Idempotency-Key: uuid-v4</code>
        </Card>
      </div>

      {/* Swagger UI embed */}
      <Card className="overflow-hidden">
        {!loaded && (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={swaggerRef} className="swagger-ui-container" />
      </Card>

      {/* Override Swagger UI styles to match dark theme */}
      <style>{`
        .swagger-ui-container .swagger-ui {
          font-family: var(--font-body, Inter, system-ui, sans-serif);
        }
        .swagger-ui-container .swagger-ui .topbar { display: none; }
        .swagger-ui-container .swagger-ui .info { margin: 0; padding: 1rem; }
        .swagger-ui-container .swagger-ui .scheme-container { display: none; }
        .dark .swagger-ui-container .swagger-ui {
          filter: invert(0.88) hue-rotate(180deg);
        }
        .dark .swagger-ui-container .swagger-ui img {
          filter: invert(1) hue-rotate(180deg);
        }
      `}</style>
    </div>
  );
}

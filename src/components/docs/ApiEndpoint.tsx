import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "./CodeBlock";
import { cn } from "@/lib/utils";

interface Param {
  name: string;
  type: string;
  required: boolean;
  desc: string;
}

interface Props {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  params?: Param[];
  code: Record<"curl" | "node" | "python", string>;
  response: string;
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  POST: "bg-primary/10 text-primary border-primary/20",
  PUT: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  PATCH: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  DELETE: "bg-destructive/10 text-destructive border-destructive/20",
};

export const ApiEndpoint = ({ method, path, title, description, params, code, response }: Props) => {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="p-5 space-y-3 border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className={cn("font-mono text-[11px] px-2 py-0.5 rounded", methodColors[method])}>
            {method}
          </Badge>
          <code className="text-sm font-mono text-muted-foreground">{path}</code>
        </div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      <div className="p-5 space-y-6">
        {params && params.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Parameters</h4>
            <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
              {params.map((p) => (
                <div key={p.name} className="flex items-start gap-4 px-4 py-3 text-sm">
                  <div className="min-w-[140px]">
                    <code className="text-xs font-mono font-semibold">{p.name}</code>
                    {p.required && <span className="text-destructive text-xs ml-1">*</span>}
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{p.type}</span>
                  </div>
                  <p className="text-muted-foreground text-[13px]">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-3">Request</h4>
          <CodeBlock code={code} />
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-3">Response</h4>
          <CodeBlock code={response} language="curl" />
        </div>
      </div>
    </div>
  );
};

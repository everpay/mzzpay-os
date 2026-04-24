import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** Anything JSON-serialisable. Strings are passed through verbatim. */
  data: unknown;
  /** Header label shown above the viewer. */
  label?: string;
  /** Constrain height to keep long payloads scrollable. */
  maxHeight?: number | string;
  className?: string;
  /** Optional secondary action rendered next to the copy button. */
  rightSlot?: React.ReactNode;
}

/**
 * JsonViewer — pretty-printed, copy-to-clipboard JSON inspector used in the
 * Card-test-run drawer (and reusable elsewhere). Falls back to `String(data)`
 * for non-serialisable input so we never blow up on a circular ref.
 */
export function JsonViewer({ data, label, maxHeight = 384, className, rightSlot }: Props) {
  const [copied, setCopied] = useState(false);

  const text = (() => {
    if (data == null) return "null";
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  })();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently ignore.
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {(label || rightSlot) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              {label}
            </h4>
          )}
          <div className="flex items-center gap-1">
            {rightSlot}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 px-2 gap-1 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}
      <pre
        className="rounded-md border border-border bg-muted/30 p-3 text-[11px] font-mono overflow-auto whitespace-pre-wrap break-words"
        style={{ maxHeight }}
      >
        <SyntaxHighlightedJson text={text} />
      </pre>
    </div>
  );
}

/**
 * Lightweight tokeniser — colours strings, numbers, booleans, and keys
 * without pulling in a full syntax highlighter.
 */
function SyntaxHighlightedJson({ text }: { text: string }) {
  // Escape HTML, then re-tokenise with regex.
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = escaped.replace(
    /("(\\.|[^"\\])*"\s*:?)|(\b(true|false|null)\b)|(-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          return `<span class="text-primary">${match}</span>`;
        }
        return `<span class="text-success">${match}</span>`;
      }
      if (/true|false/.test(match)) {
        return `<span class="text-warning">${match}</span>`;
      }
      if (/null/.test(match)) {
        return `<span class="text-muted-foreground italic">${match}</span>`;
      }
      return `<span class="text-foreground">${match}</span>`;
    },
  );

  return <code dangerouslySetInnerHTML={{ __html: html }} />;
}

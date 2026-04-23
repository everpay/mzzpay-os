import { DOCS_SECTIONS } from "@/lib/docs-content";

interface Props {
  /** id from DOCS_SECTIONS */
  sectionId: string;
}

/**
 * Render a section from the shared docs source as styled prose.
 * Treats indented blocks (4+ spaces) as code, everything else as paragraphs.
 * Keeps the on-page docs in lock-step with the LLM doc and the PDF export.
 */
export const DocsContentSection = ({ sectionId }: Props) => {
  const section = DOCS_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return null;

  const blocks = section.body.split("\n\n");

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const isCode = block
          .split("\n")
          .every((l) => l.startsWith("    ") || l.trim() === "");
        if (isCode) {
          const code = block
            .split("\n")
            .map((l) => l.replace(/^ {4}/, ""))
            .join("\n");
          return (
            <pre
              key={i}
              className="rounded-xl border border-border bg-muted/40 p-4 text-[12.5px] leading-relaxed font-mono overflow-x-auto"
            >
              {code}
            </pre>
          );
        }
        return (
          <p
            key={i}
            className="text-[15px] leading-relaxed text-muted-foreground whitespace-pre-line [&_code]:text-[13px] [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:border [&_code]:border-border [&_code]:font-mono"
          >
            {renderInlineCode(block)}
          </p>
        );
      })}
    </div>
  );
};

/** Render simple `inline code` spans inside paragraph text. */
function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) {
      return <code key={i}>{p.slice(1, -1)}</code>;
    }
    return <span key={i}>{p}</span>;
  });
}

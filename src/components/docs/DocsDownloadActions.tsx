import { Download, FileText } from "lucide-react";
import { downloadDocsPdf } from "@/lib/docs-pdf";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

/**
 * Lightweight inline text links for the docs header:
 *  - Download the full reference as a branded PDF
 *  - Open the LLM-friendly /llms.txt version
 *
 * Rendered as text links (not buttons) so they sit quietly next to the
 * search bar and theme toggle without competing with primary CTAs.
 */
export const DocsDownloadActions = ({ className }: Props) => {
  const linkClass =
    "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors";

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <button
        type="button"
        onClick={() => downloadDocsPdf()}
        className={linkClass}
      >
        <Download className="w-3.5 h-3.5" />
        Download PDF
      </button>
      <Link
        to="/llms.txt"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        <FileText className="w-3.5 h-3.5" />
        LLM version
      </Link>
    </div>
  );
};

import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { downloadDocsPdf } from "@/lib/docs-pdf";
import { Link } from "react-router-dom";

interface Props {
  className?: string;
}

/**
 * Pair of buttons used at the top of the developer docs:
 *  - Download the full reference as a branded PDF
 *  - Open the LLM-friendly /llms.txt version (great for ChatGPT / Claude / Cursor)
 */
export const DocsDownloadActions = ({ className }: Props) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Button
        size="sm"
        variant="default"
        onClick={() => downloadDocsPdf()}
        className="gap-1.5 rounded-full"
      >
        <Download className="w-3.5 h-3.5" />
        Download PDF
      </Button>
      <Button
        asChild
        size="sm"
        variant="outline"
        className="gap-1.5 rounded-full"
      >
        <Link to="/llms.txt" target="_blank" rel="noopener noreferrer">
          <FileText className="w-3.5 h-3.5" />
          LLM version
        </Link>
      </Button>
    </div>
  );
};

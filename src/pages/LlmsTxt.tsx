import { useEffect } from "react";
import { buildLlmDoc } from "@/lib/docs-llm";

/**
 * Renders the LLM-friendly developer doc as plain text.
 * Reachable at /llms.txt — paste the URL into ChatGPT / Claude / Cursor for
 * grounded answers.
 */
export default function LlmsTxt() {
  const text = buildLlmDoc();

  useEffect(() => {
    document.title = "MzzPay API — llms.txt";
  }, []);

  return (
    <pre
      style={{
        margin: 0,
        padding: "24px",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        background: "#0b0f17",
        color: "#e6edf3",
        minHeight: "100vh",
      }}
    >
      {text}
    </pre>
  );
}

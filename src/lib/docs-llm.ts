import { DOCS_DOCUMENT_TITLE, DOCS_META, DOCS_SECTIONS } from "./docs-content";

/** Build the plain-text/Markdown LLM doc that powers /llms.txt and /docs.txt downloads. */
export function buildLlmDoc(): string {
  const header = [
    `# ${DOCS_DOCUMENT_TITLE}`,
    ``,
    `Base URL: ${DOCS_META.baseUrl}`,
    `Auth header: ${DOCS_META.apiKeyHeader}: Bearer <secret_key>`,
    `Webhook signature header: ${DOCS_META.signatureHeader}`,
    `Contact: ${DOCS_META.contact}`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `---`,
    ``,
  ].join("\n");

  const body = DOCS_SECTIONS.map(
    (s) => `## ${s.title}\n\n${s.body}\n`,
  ).join("\n---\n\n");

  return header + body;
}

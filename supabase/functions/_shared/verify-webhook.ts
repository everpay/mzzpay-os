// Shared helper for verifying inbound webhook signatures using HMAC-SHA256.
// Provides constant-time comparison and a "required secret" mode so a missing
// env var fails closed instead of silently accepting unsigned requests.

export type SignatureEncoding = "hex" | "base64";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function hmacSha256(secret: string, body: string, encoding: SignatureEncoding = "hex"): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const bytes = new Uint8Array(sig);
  if (encoding === "base64") return btoa(String.fromCharCode(...bytes));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface VerifyOptions {
  secret: string | undefined;
  body: string;
  signature: string | null | undefined;
  encoding?: SignatureEncoding;
  /** When true, missing secret returns failure instead of allowing the request through. */
  requireSecret?: boolean;
}

export interface VerifyResult {
  ok: boolean;
  reason?: "missing_secret" | "missing_signature" | "mismatch";
}

export async function verifyHmacSignature({
  secret, body, signature, encoding = "hex", requireSecret = true,
}: VerifyOptions): Promise<VerifyResult> {
  if (!secret) return requireSecret ? { ok: false, reason: "missing_secret" } : { ok: true };
  if (!signature) return { ok: false, reason: "missing_signature" };
  const expected = await hmacSha256(secret, body, encoding);
  // Strip common prefixes like "sha256=" used by GitHub-style webhooks.
  const actual = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  return constantTimeEqual(expected.toLowerCase(), actual.toLowerCase())
    ? { ok: true }
    : { ok: false, reason: "mismatch" };
}

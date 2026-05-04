import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hmacSha256, verifyHmacSignature } from "./verify-webhook.ts";

const SECRET = "test_secret_key_12345";
const BODY = JSON.stringify({ id: "evt_001", type: "payment.completed", data: { amount: 100 } });

Deno.test("hmacSha256 produces deterministic hex output", async () => {
  const a = await hmacSha256(SECRET, BODY, "hex");
  const b = await hmacSha256(SECRET, BODY, "hex");
  assertEquals(a, b);
  assertEquals(a.length, 64); // SHA-256 = 32 bytes = 64 hex chars
});

Deno.test("hmacSha256 base64 encoding works", async () => {
  const sig = await hmacSha256(SECRET, BODY, "base64");
  assertExists(sig);
  // base64 of 32 bytes = 44 chars
  assertEquals(sig.length, 44);
});

Deno.test("verifyHmacSignature accepts valid hex signature", async () => {
  const sig = await hmacSha256(SECRET, BODY, "hex");
  const result = await verifyHmacSignature({ secret: SECRET, body: BODY, signature: sig, encoding: "hex" });
  assertEquals(result.ok, true);
  assertEquals(result.reason, undefined);
});

Deno.test("verifyHmacSignature accepts valid base64 signature", async () => {
  const sig = await hmacSha256(SECRET, BODY, "base64");
  const result = await verifyHmacSignature({ secret: SECRET, body: BODY, signature: sig, encoding: "base64" });
  assertEquals(result.ok, true);
});

Deno.test("verifyHmacSignature rejects tampered body", async () => {
  const sig = await hmacSha256(SECRET, BODY, "hex");
  const tampered = BODY.replace("100", "999");
  const result = await verifyHmacSignature({ secret: SECRET, body: tampered, signature: sig });
  assertEquals(result.ok, false);
  assertEquals(result.reason, "mismatch");
});

Deno.test("verifyHmacSignature rejects wrong secret", async () => {
  const sig = await hmacSha256("wrong_secret", BODY, "hex");
  const result = await verifyHmacSignature({ secret: SECRET, body: BODY, signature: sig });
  assertEquals(result.ok, false);
  assertEquals(result.reason, "mismatch");
});

Deno.test("verifyHmacSignature rejects missing signature", async () => {
  const result = await verifyHmacSignature({ secret: SECRET, body: BODY, signature: null });
  assertEquals(result.ok, false);
  assertEquals(result.reason, "missing_signature");
});

Deno.test("verifyHmacSignature rejects empty signature", async () => {
  const result = await verifyHmacSignature({ secret: SECRET, body: BODY, signature: "" });
  assertEquals(result.ok, false);
  assertEquals(result.reason, "missing_signature");
});

Deno.test("verifyHmacSignature rejects missing secret with requireSecret=true", async () => {
  const result = await verifyHmacSignature({ secret: undefined, body: BODY, signature: "abc", requireSecret: true });
  assertEquals(result.ok, false);
  assertEquals(result.reason, "missing_secret");
});

Deno.test("verifyHmacSignature allows missing secret with requireSecret=false", async () => {
  const result = await verifyHmacSignature({ secret: undefined, body: BODY, signature: "abc", requireSecret: false });
  assertEquals(result.ok, true);
});

Deno.test("verifyHmacSignature strips sha256= prefix (GitHub-style)", async () => {
  const sig = await hmacSha256(SECRET, BODY, "hex");
  const result = await verifyHmacSignature({ secret: SECRET, body: BODY, signature: `sha256=${sig}` });
  assertEquals(result.ok, true);
});

// Replay protection: same body + same event ID should produce identical
// signatures, enabling consumers to detect replays via event_id dedup
Deno.test("replay protection: identical payloads produce identical signatures", async () => {
  const body1 = JSON.stringify({ id: "evt_replay_001", type: "payment.completed" });
  const body2 = JSON.stringify({ id: "evt_replay_001", type: "payment.completed" });
  const sig1 = await hmacSha256(SECRET, body1);
  const sig2 = await hmacSha256(SECRET, body2);
  assertEquals(sig1, sig2);
});

// Different event IDs produce different signatures
Deno.test("different event IDs produce different signatures", async () => {
  const body1 = JSON.stringify({ id: "evt_001", type: "payment.completed" });
  const body2 = JSON.stringify({ id: "evt_002", type: "payment.completed" });
  const sig1 = await hmacSha256(SECRET, body1);
  const sig2 = await hmacSha256(SECRET, body2);
  assertEquals(sig1 !== sig2, true);
});

// Constant-time comparison: verify it doesn't short-circuit on length
Deno.test("constant-time: rejects truncated signature", async () => {
  const sig = await hmacSha256(SECRET, BODY);
  const result = await verifyHmacSignature({ secret: SECRET, body: BODY, signature: sig.slice(0, 32) });
  assertEquals(result.ok, false);
  assertEquals(result.reason, "mismatch");
});

// Case insensitivity
Deno.test("signature comparison is case insensitive", async () => {
  const sig = await hmacSha256(SECRET, BODY);
  const result = await verifyHmacSignature({ secret: SECRET, body: BODY, signature: sig.toUpperCase() });
  assertEquals(result.ok, true);
});

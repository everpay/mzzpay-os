/**
 * Lightweight client-side helper for storing gateway credentials.
 *
 * NOTE: This project does not yet expose a `vgs-encrypt` Edge Function.
 * To avoid blocking the Integrations UX, this helper currently passes
 * credential values through unchanged. When the VGS proxy is wired up,
 * swap the implementation of `encryptWithVGS` to call the edge function
 * (see Everpay Platform OS for the reference implementation).
 *
 * Stored values are still protected at-rest by Supabase RLS — only the
 * owning merchant (or admin) can read the row.
 */

export async function encryptWithVGS(
  fields: Record<string, string>,
): Promise<{ aliases: Record<string, string>; vault: string }> {
  // TODO: replace with real VGS proxy call.
  return { aliases: { ...fields }, vault: 'pass-through' };
}

export async function encryptFields(
  obj: Record<string, string>,
  _context?: string,
): Promise<Record<string, string>> {
  const nonEmpty: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.trim()) nonEmpty[key] = value;
  }
  if (Object.keys(nonEmpty).length === 0) return obj;
  const { aliases } = await encryptWithVGS(nonEmpty);
  return { ...obj, ...aliases };
}

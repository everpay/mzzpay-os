/**
 * VGS USAGE POLICY (project-wide)
 * --------------------------------
 * VGS is used for TWO purposes only:
 *   1. Vaulting cards intended for recurring billing / card-on-file.
 *   2. Securing payment FORMS (VGS Collect iframe fields) so raw PAN never
 *      touches our frontend or backend in plaintext.
 *
 * Live, one-off payment data is sent DIRECTLY to the destination processor
 * (Mondo / MzzPay / Matrix / etc). We do NOT proxy transactional traffic
 * through VGS Outbound — that path is reserved for tokenization only.
 *
 * This helper exists so non-card credential fields (e.g. gateway API
 * secrets stored on the Integrations page) can be aliased before they hit
 * the database. RLS still protects the row at-rest.
 */

export async function encryptWithVGS(
  fields: Record<string, string>,
): Promise<{ aliases: Record<string, string>; vault: string }> {
  // TODO: replace with real VGS proxy call when the vgs-encrypt edge function lands.
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

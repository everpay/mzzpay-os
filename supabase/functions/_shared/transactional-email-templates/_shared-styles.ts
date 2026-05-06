/// <reference types="npm:@types/react@18.3.1" />

/**
 * Shared style tokens for MzzPay transactional email templates.
 *
 * Lynk-inspired hero-gradient layout with detail rows below.
 * Email-client safe: hex colors, web-safe font fallbacks, inline styles.
 */

export const SITE_NAME = 'MzzPay'
export const BRAND_PRIMARY = '#1bc7a4' // electric teal
export const BRAND_PRIMARY_DEEP = '#0f7a66'
export const BRAND_GRADIENT_START = '#0f7a66'
export const BRAND_GRADIENT_END = '#1bc7a4'
export const LOGO_URL =
  'https://sprjfzeyyihtfvxnfuhb.supabase.co/storage/v1/object/public/email-assets/mzzpay-icon.png'

/** Truncate a long transaction/order ID to a readable short form */
export function shortId(id?: string): string {
  if (!id) return 'N/A'
  // If already short (≤12 chars), return as-is
  if (id.length <= 12) return id
  // Strip common prefixes
  const stripped = id.replace(/^(tx-|txn_|ord_|ch_|ref_|set_|inv_|sub_|pay_)/, '')
  // Return first 10 digits/chars
  const digits = stripped.replace(/[^a-zA-Z0-9]/g, '')
  return digits.slice(0, 10).toUpperCase()
}

export const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: "'Inter', 'Helvetica Neue', 'Segoe UI', Arial, sans-serif",
  padding: '20px 0',
} as const

export const container = {
  maxWidth: '480px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  overflow: 'hidden' as const,
} as const

// --- Hero banner (gradient) ---
export const heroBanner = {
  background: 'linear-gradient(135deg, #0f7a66 0%, #1bc7a4 50%, #0ea5e9 100%)',
  padding: '36px 28px 32px',
  textAlign: 'center' as const,
} as const

export const heroLogoImg = {
  borderRadius: '8px',
  display: 'inline-block',
  verticalAlign: 'middle',
  marginRight: '8px',
  border: 0,
  outline: 'none',
  textDecoration: 'none',
} as const

export const heroLogoText = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  display: 'inline-block',
  verticalAlign: 'middle',
  letterSpacing: '-0.02em',
  fontFamily: "'Manrope', 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
} as const

export const heroHeading = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#ffffff',
  margin: '20px 0 8px',
  fontFamily: "'Manrope', 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  letterSpacing: '-0.01em',
  lineHeight: '1.2',
} as const

export const heroSubtext = {
  fontSize: '15px',
  color: 'rgba(255,255,255,0.85)',
  margin: '0',
  lineHeight: '1.5',
} as const

// --- Body / details section ---
export const bodySection = {
  padding: '24px 28px 28px',
} as const

export const detailsTable = {
  width: '100%',
  margin: '0',
} as const

export const detailRow = {
  borderBottom: '1px solid #f1f5f9',
} as const

export const detailLabelCol = {
  width: '45%',
  padding: '10px 8px 10px 0',
  verticalAlign: 'top' as const,
} as const

export const detailValueCol = {
  width: '55%',
  padding: '10px 0 10px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
} as const

export const detailLabel = {
  fontSize: '14px',
  color: '#64748b',
  fontWeight: '600' as const,
} as const

export const detailValue = {
  fontSize: '14px',
  color: '#0f172a',
  fontWeight: '600' as const,
} as const

export const detailValueGreen = {
  fontSize: '14px',
  color: BRAND_PRIMARY_DEEP,
  fontWeight: '700' as const,
} as const

export const detailValueRed = {
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: '700' as const,
} as const

export const detailValueMono = {
  fontSize: '13px',
  color: '#0f172a',
  fontWeight: '600' as const,
  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
} as const

// Legacy aliases (used by some templates)
export const logoSection = { margin: '0 0 24px' } as const
export const logoImg = heroLogoImg
export const logoText = heroLogoText
export const h1 = heroHeading
export const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 20px',
} as const
export const detailsBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
  border: '1px solid #e2e8f0',
} as const
export const successBox = {
  backgroundColor: '#e6fbf6',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
  border: '1px solid #b8efe1',
} as const
export const errorBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
  border: '1px solid #fecaca',
} as const
export const warningBox = {
  backgroundColor: '#fffbeb',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 24px',
  border: '1px solid #fde68a',
} as const

export const button = {
  backgroundColor: BRAND_PRIMARY,
  color: '#06241d',
  borderRadius: '12px',
  padding: '14px 28px',
  fontSize: '15px',
  fontWeight: '700' as const,
  textDecoration: 'none',
  display: 'inline-block',
  margin: '0 0 24px',
  border: '1px solid #13a589',
  fontFamily: "'Manrope', 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
} as const

export const hr = {
  borderColor: '#e2e8f0',
  borderWidth: '1px 0 0 0',
  borderStyle: 'solid',
  margin: '24px 0',
} as const

export const footer = {
  fontSize: '12px',
  color: '#7a8696',
  lineHeight: '1.65',
  margin: '0',
  textAlign: 'center' as const,
  padding: '0 28px 24px',
} as const

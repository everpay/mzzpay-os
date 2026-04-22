/// <reference types="npm:@types/react@18.3.1" />

/**
 * Shared style tokens for MzzPay transactional email templates.
 *
 * Mirrors the brand tokens used by the auth email templates
 * (`_shared/email-branding.ts`). Defined locally here to keep templates
 * self-contained and easy to render in the preview function.
 *
 * Email-client safe: hex colors, web-safe font fallbacks, inline styles.
 * Body background is always #ffffff per email-system rules.
 */

export const SITE_NAME = 'MzzPay'
export const BRAND_PRIMARY = '#1bc7a4' // electric teal
export const BRAND_PRIMARY_DEEP = '#0f7a66'
export const LOGO_URL =
  'https://sprjfzeyyihtfvxnfuhb.supabase.co/storage/v1/object/public/email-assets/mzzpay-icon.png'

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', 'Helvetica Neue', 'Segoe UI', Arial, sans-serif",
} as const

export const container = {
  padding: '32px 28px',
  maxWidth: '480px',
  margin: '0 auto',
} as const

export const logoSection = {
  margin: '0 0 24px',
} as const

export const logoImg = {
  borderRadius: '8px',
  display: 'inline-block',
  verticalAlign: 'middle',
  marginRight: '10px',
  border: 0,
  outline: 'none',
  textDecoration: 'none',
} as const

export const logoText = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0',
  display: 'inline-block',
  verticalAlign: 'middle',
  letterSpacing: '-0.02em',
  fontFamily: "'Manrope', 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
} as const

export const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 12px',
  fontFamily: "'Manrope', 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  letterSpacing: '-0.01em',
} as const

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

export const detailRow = { fontSize: '14px', margin: '6px 0' } as const
export const detailLabel = { color: '#64748b' } as const
export const detailValue = { color: '#0f172a', fontWeight: '600' as const } as const
export const detailValueGreen = { color: BRAND_PRIMARY_DEEP, fontWeight: '600' as const } as const
export const detailValueRed = { color: '#dc2626', fontWeight: '600' as const } as const
export const detailValueMono = {
  color: '#0f172a',
  fontWeight: '600' as const,
  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  fontSize: '12px',
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
} as const

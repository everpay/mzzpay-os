/// <reference types="npm:@types/react@18.3.1" />

/**
 * Centralized MzzPay email branding.
 *
 * Single source of truth for colors, typography, logo, and shared styles
 * used across BOTH auth email templates (_shared/email-templates) and
 * transactional templates (_shared/transactional-email-templates).
 *
 * Update brand values here and all email templates pick them up automatically.
 *
 * Design notes (email-client safe):
 * - Colors are written as hex/rgb (NOT hsl) — Outlook 2016+ does not parse hsl().
 * - Backgrounds always use solid hex values, never CSS variables or named colors.
 * - The body background stays #ffffff (white) per email-system rules.
 * - Inner cards/sections use a soft #f8fafc surface so dark-mode email clients
 *   (Apple Mail, Gmail dark) keep good contrast on the navy text and teal accents.
 */

// ─── Brand Identity ─────────────────────────────────────────────────
export const BRAND = {
  name: 'MzzPay',
  tagline: 'Modern payments infrastructure',
  rootDomain: 'mzzpay.io',
  siteUrl: 'https://mzzpay.io',
  // Centralized logo. Hosted in the public email-assets bucket so every
  // email client (including those that reject relative paths) can fetch it.
  logoIconUrl:
    'https://sprjfzeyyihtfvxnfuhb.supabase.co/storage/v1/object/public/email-assets/mzzpay-icon.png',
  // Used as a fallback / wider lockup if a template wants the full wordmark.
  logoLockupUrl:
    'https://sprjfzeyyihtfvxnfuhb.supabase.co/storage/v1/object/public/email-assets/mzzpay-logo.png',
} as const

// ─── Color Tokens (hex — email-safe) ────────────────────────────────
// Electric Teal (the "MzzPay teal") in hex equivalents.
export const COLORS = {
  // Surfaces
  bodyBg: '#ffffff',
  surfaceSoft: '#f3f7f9',
  surfaceCard: '#f8fafc',
  surfaceTeal: '#e6fbf6',
  surfaceTealBorder: '#b8efe1',

  // Brand
  teal: '#1bc7a4', // hsl(172, 72%, 45%) equivalent
  tealStrong: '#13a589', // hsl(172, 78%, 36%)
  tealDeep: '#0f7a66', // for link text (better contrast on white)
  tealOnDarkAccent: '#3ee0bb', // brighter teal that survives dark-mode color inversion

  // Text
  textPrimary: '#0f172a', // near-black navy — heading colour
  textBody: '#334155', // ↑ contrast vs prior #475569 for dark-mode friendliness
  textMuted: '#64748b',
  textFooter: '#7a8696', // ↑ contrast vs prior #94a3b8

  // Borders & dividers
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',

  // States
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  successBg: '#f0fdf4',
} as const

// ─── Typography ─────────────────────────────────────────────────────
// Web-safe fallback stacks. Manrope/Space Grotesk/Inter rarely render in
// email clients — the fallbacks (Helvetica Neue → Arial) carry most renders.
export const FONTS = {
  body: "'Inter', 'Helvetica Neue', 'Segoe UI', Arial, sans-serif",
  heading: "'Manrope', 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
} as const

// ─── Shared Style Objects ───────────────────────────────────────────
// Import these into any email template instead of redefining inline styles.

export const styles = {
  main: {
    backgroundColor: COLORS.bodyBg,
    fontFamily: FONTS.body,
    margin: 0,
    padding: 0,
    // MSO-safe: Outlook ignores this, but Apple Mail / Gmail honor it for
    // a slightly warmer canvas in dark mode.
    color: COLORS.textBody,
  } as const,

  container: {
    padding: '32px 28px',
    maxWidth: '560px',
    margin: '0 auto',
    backgroundColor: COLORS.bodyBg,
  } as const,

  // ─── Header / Logo ────────────────────────────────────
  header: { padding: '0 0 8px' } as const,

  logoRow: {
    margin: '0 0 28px',
  } as const,

  logoImg: {
    display: 'inline-block',
    verticalAlign: 'middle',
    margin: 0,
    border: 0,
    outline: 'none',
    textDecoration: 'none',
  } as const,

  logoWordmark: {
    display: 'inline-block',
    verticalAlign: 'middle',
    fontFamily: FONTS.heading,
    fontSize: '26px',
    fontWeight: 800 as const,
    color: COLORS.textPrimary,
    letterSpacing: '-0.02em',
    marginLeft: '12px',
    lineHeight: '40px',
  } as const,

  // ─── Typography ───────────────────────────────────────
  h1: {
    fontSize: '28px',
    fontWeight: 700 as const,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    margin: '0 0 16px',
    letterSpacing: '-0.015em',
    lineHeight: '1.25',
  } as const,

  h2: {
    fontSize: '18px',
    fontWeight: 700 as const,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    margin: '0 0 12px',
    letterSpacing: '-0.01em',
  } as const,

  text: {
    fontSize: '15px',
    color: COLORS.textBody,
    lineHeight: '1.6',
    margin: '0 0 16px',
    fontFamily: FONTS.body,
  } as const,

  smallText: {
    fontSize: '12px',
    color: COLORS.textMuted,
    lineHeight: '1.5',
    margin: '20px 0 0',
    wordBreak: 'break-all' as const,
    fontFamily: FONTS.body,
  } as const,

  link: {
    color: COLORS.tealDeep,
    textDecoration: 'underline',
    fontWeight: 600 as const,
  } as const,

  // ─── Buttons ──────────────────────────────────────────
  buttonWrapper: { margin: '24px 0 8px', textAlign: 'left' as const } as const,

  button: {
    backgroundColor: COLORS.teal,
    color: '#06241d', // dark text on teal — best contrast and survives dark-mode color inversion
    fontSize: '15px',
    fontWeight: 700 as const,
    borderRadius: '12px',
    padding: '14px 28px',
    textDecoration: 'none',
    display: 'inline-block',
    fontFamily: FONTS.heading,
    letterSpacing: '-0.005em',
    border: `1px solid ${COLORS.tealStrong}`,
  } as const,

  // ─── Code / OTP boxes ─────────────────────────────────
  codeBox: {
    backgroundColor: COLORS.surfaceTeal,
    border: `1px solid ${COLORS.surfaceTealBorder}`,
    borderRadius: '14px',
    padding: '22px',
    textAlign: 'center' as const,
    margin: '8px 0 24px',
  } as const,

  codeText: {
    fontFamily: FONTS.mono,
    fontSize: '34px',
    fontWeight: 700 as const,
    color: COLORS.tealDeep,
    letterSpacing: '8px',
    margin: 0,
    lineHeight: '1.2',
  } as const,

  // ─── Divider & footer ────────────────────────────────
  hr: {
    borderColor: COLORS.border,
    borderWidth: '1px 0 0 0',
    borderStyle: 'solid',
    margin: '32px 0 20px',
  } as const,

  footer: {
    fontSize: '12px',
    color: COLORS.textFooter,
    lineHeight: '1.65',
    margin: 0,
    fontFamily: FONTS.body,
  } as const,

  // ─── Detail card (used by transactional templates for KV layouts) ───
  detailCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: '12px',
    padding: '20px 22px',
    margin: '4px 0 24px',
    border: `1px solid ${COLORS.border}`,
  } as const,

  // Accent banner — soft teal stripe for "good news" templates
  accentBanner: {
    backgroundColor: COLORS.surfaceTeal,
    borderRadius: '12px',
    padding: '20px 22px',
    margin: '4px 0 24px',
    borderLeft: `4px solid ${COLORS.teal}`,
  } as const,

  // Danger banner — for failed payments etc.
  dangerBanner: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: '12px',
    padding: '20px 22px',
    margin: '4px 0 24px',
    borderLeft: `4px solid ${COLORS.danger}`,
  } as const,
} as const

// ─── Standard footer copy ───────────────────────────────────────────
export const FOOTER_LINE = `© ${BRAND.name} · ${BRAND.tagline}`

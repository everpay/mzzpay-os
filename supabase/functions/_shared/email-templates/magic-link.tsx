/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://sprjfzeyyihtfvxnfuhb.supabase.co/storage/v1/object/public/email-assets/mzzpay-logo.png'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your MZZPay login link</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} width="48" height="48" alt="MZZPay" style={logoImg} />
        </Section>
        <Heading style={h1}>Sign in to your dashboard</Heading>
        <Text style={text}>
          Click the button below to securely sign in to your MZZPay merchant dashboard. This link will expire shortly.
        </Text>
        <Section style={buttonWrapper}>
          <Button style={button} href={confirmationUrl}>Sign in</Button>
        </Section>
        <Text style={smallText}>
          Or paste this link into your browser:<br />
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.<br />
          © MZZPay · Modern payments infrastructure
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto' }
const header = { padding: '0 0 8px' }
const logoImg = { display: 'block', margin: '0 0 24px' }
const h1 = {
  fontSize: '26px',
  fontWeight: 700 as const,
  fontFamily: "'Manrope', 'Inter', sans-serif",
  color: '#0f172a',
  margin: '0 0 16px',
  letterSpacing: '-0.01em',
}
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const smallText = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '20px 0 0', wordBreak: 'break-all' as const }
const link = { color: 'hsl(172, 72%, 38%)', textDecoration: 'underline' }
const buttonWrapper = { margin: '24px 0 4px' }
const button = {
  backgroundColor: 'hsl(172, 72%, 42%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '32px 0 20px' }
const footer = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }

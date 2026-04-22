/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://sprjfzeyyihtfvxnfuhb.supabase.co/storage/v1/object/public/email-assets/mzzpay-logo.png'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your MZZPay verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img src={LOGO_URL} width="48" height="48" alt="MZZPay" style={logoImg} />
        </Section>
        <Heading style={h1}>Confirm your identity</Heading>
        <Text style={text}>Use the code below to verify your identity:</Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.<br />
          © MZZPay · Modern payments infrastructure
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeBox = {
  backgroundColor: 'hsl(172, 60%, 96%)',
  border: '1px solid hsl(172, 60%, 88%)',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '8px 0 24px',
}
const codeStyle = {
  fontFamily: "'JetBrains Mono', 'Fira Code', Courier, monospace",
  fontSize: '32px',
  fontWeight: 700 as const,
  color: 'hsl(172, 72%, 28%)',
  letterSpacing: '6px',
  margin: 0,
}
const hr = { borderColor: '#e2e8f0', margin: '32px 0 20px' }
const footer = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', margin: 0 }

/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://zzxcqvyhhueffxzekfzs.supabase.co/storage/v1/object/public/email-assets/mzzpay-logo.png'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <link href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&display=swap" rel="stylesheet" />
    </Head>
    <Preview>Welcome to MzzPay — confirm your email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} width="40" height="40" alt="MzzPay" style={logoImg} />
        <Text style={logo}>MzzPay</Text>
        <Heading style={h1}>Welcome aboard</Heading>
        <Text style={text}>
          Thanks for creating your merchant account with{' '}
          <Link href={siteUrl} style={link}>
            <strong>MzzPay</strong>
          </Link>
          .
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) to get started:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const logoImg = { borderRadius: '8px', margin: '0 0 12px' }
const logo = {
  fontSize: '28px',
  fontWeight: '400' as const,
  fontFamily: "'Bagel Fat One', 'Arial Black', sans-serif",
  color: 'hsl(219, 100%, 40%)',
  letterSpacing: '0.5px',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  fontFamily: "'Manrope', 'Inter', sans-serif",
  color: '#0f172a',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#64748b',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const link = { color: 'hsl(219, 100%, 45%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(219, 100%, 40%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '9999px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0' }

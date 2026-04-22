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
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { BRAND, FOOTER_LINE, styles } from '../email-branding.ts'
import { BrandHeader } from './_brand-header.tsx'

interface SignupEmailProps {
  siteName?: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
}

export const SignupEmail = ({
  siteUrl = BRAND.siteUrl,
  recipient = '',
  confirmationUrl = '#',
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {BRAND.name} — confirm your email to activate your dashboard</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Welcome aboard</Heading>
        <Text style={styles.text}>
          Thanks for creating your merchant account with{' '}
          <Link href={siteUrl} style={styles.link}>{BRAND.name}</Link>.
        </Text>
        <Text style={styles.text}>
          Please confirm <strong style={{ color: '#0f172a' }}>{recipient}</strong> to activate your dashboard:
        </Text>
        <Section style={styles.buttonWrapper}>
          <Button style={styles.button} href={confirmationUrl}>Verify email</Button>
        </Section>
        <Text style={styles.smallText}>
          Or paste this link into your browser:<br />
          <Link href={confirmationUrl} style={styles.link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={styles.hr} />
        <Text style={styles.footer}>
          If you didn't create an account, you can safely ignore this email.<br />
          {FOOTER_LINE}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

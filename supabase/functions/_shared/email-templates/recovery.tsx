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

interface RecoveryEmailProps {
  siteName?: string
  confirmationUrl?: string
}

export const RecoveryEmail = ({ confirmationUrl = '#' }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {BRAND.name} password</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Reset your password</Heading>
        <Text style={styles.text}>
          We received a request to reset your password for your {BRAND.name} merchant dashboard. Click the button below to choose a new password.
        </Text>
        <Section style={styles.buttonWrapper}>
          <Button style={styles.button} href={confirmationUrl}>Reset password</Button>
        </Section>
        <Text style={styles.smallText}>
          Or paste this link into your browser:<br />
          <Link href={confirmationUrl} style={styles.link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={styles.hr} />
        <Text style={styles.footer}>
          If you didn't request a password reset, you can safely ignore this email — your password won't change.<br />
          {FOOTER_LINE}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

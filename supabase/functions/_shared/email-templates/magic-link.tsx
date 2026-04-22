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

interface MagicLinkEmailProps {
  siteName?: string
  confirmationUrl?: string
}

export const MagicLinkEmail = ({ confirmationUrl = '#' }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your secure {BRAND.name} sign-in link</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Sign in to your dashboard</Heading>
        <Text style={styles.text}>
          Click the button below to securely sign in to your {BRAND.name} merchant dashboard. This link will expire shortly.
        </Text>
        <Section style={styles.buttonWrapper}>
          <Button style={styles.button} href={confirmationUrl}>Sign in to {BRAND.name}</Button>
        </Section>
        <Text style={styles.smallText}>
          Or paste this link into your browser:<br />
          <Link href={confirmationUrl} style={styles.link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={styles.hr} />
        <Text style={styles.footer}>
          If you didn't request this link, you can safely ignore this email.<br />
          {FOOTER_LINE}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

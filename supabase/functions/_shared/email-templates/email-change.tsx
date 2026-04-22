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

interface EmailChangeEmailProps {
  siteName?: string
  email?: string
  newEmail?: string
  confirmationUrl?: string
}

export const EmailChangeEmail = ({
  email = '',
  newEmail = '',
  confirmationUrl = '#',
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new email address for {BRAND.name}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Confirm your email change</Heading>
        <Text style={styles.text}>
          You requested to change your {BRAND.name} account email from{' '}
          <Link href={`mailto:${email}`} style={styles.link}>{email}</Link> to{' '}
          <Link href={`mailto:${newEmail}`} style={styles.link}>{newEmail}</Link>.
        </Text>
        <Section style={styles.buttonWrapper}>
          <Button style={styles.button} href={confirmationUrl}>Confirm email change</Button>
        </Section>
        <Text style={styles.smallText}>
          Or paste this link into your browser:<br />
          <Link href={confirmationUrl} style={styles.link}>{confirmationUrl}</Link>
        </Text>
        <Hr style={styles.hr} />
        <Text style={styles.footer}>
          If you didn't request this change, please secure your account immediately.<br />
          {FOOTER_LINE}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import { BRAND, FOOTER_LINE, styles } from '../email-branding.ts'
import { BrandHeader } from './_brand-header.tsx'

interface ReauthenticationEmailProps {
  token?: string
}

export const ReauthenticationEmail = ({ token = '------' }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {BRAND.name} verification code</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <BrandHeader />
        <Heading style={styles.h1}>Confirm your identity</Heading>
        <Text style={styles.text}>Use the code below to verify your identity:</Text>
        <Section style={styles.codeBox}>
          <Text style={styles.codeText}>{token}</Text>
        </Section>
        <Hr style={styles.hr} />
        <Text style={styles.footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.<br />
          {FOOTER_LINE}
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

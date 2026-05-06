/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, detailsBox, detailRow, detailLabel, detailValue, hr, footer,
} from './_shared-styles.ts'

interface Props {
  userEmail?: string
  displayName?: string
  businessName?: string
  signupDate?: string
}

const AdminNewSignupEmail = ({ userEmail, displayName, businessName, signupDate }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New signup: {userEmail || 'unknown'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>New User Signup</Heading>
        <Text style={text}>
          A new user has signed up and completed onboarding on {SITE_NAME}.
        </Text>
        <Section style={detailsBox}>
          <Text style={detailRow}>
            <span style={detailLabel}>Email: </span>
            <span style={detailValue}>{userEmail || '—'}</span>
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>Name: </span>
            <span style={detailValue}>{displayName || '—'}</span>
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>Business: </span>
            <span style={detailValue}>{businessName || '—'}</span>
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>Date: </span>
            <span style={detailValue}>{signupDate || new Date().toISOString()}</span>
          </Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated admin notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminNewSignupEmail,
  subject: (data: Record<string, any>) => `New signup: ${data?.userEmail || 'Unknown'}`,
  displayName: 'Admin – new user signup notification',
  to: 'admin@mzzpay.io',
  previewData: {
    userEmail: 'jane@example.com',
    displayName: 'Jane Doe',
    businessName: 'Acme Corp',
    signupDate: '2026-05-06T12:00:00Z',
  },
} satisfies TemplateEntry

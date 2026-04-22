/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, button, hr, footer,
} from './_shared-styles.ts'

interface Props {
  name?: string
  merchantName?: string
  dashboardUrl?: string
}

const CustomerWelcomeEmail = ({ name, merchantName, dashboardUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {merchantName || SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>{name ? `Welcome, ${name}!` : 'Welcome aboard!'}</Heading>
        <Text style={text}>
          Your account with {merchantName || SITE_NAME} has been created. You can now manage your payments, view transaction history, and more.
        </Text>
        {dashboardUrl && <Button href={dashboardUrl} style={button}>Go to Dashboard</Button>}
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CustomerWelcomeEmail,
  subject: `Welcome to ${SITE_NAME}`,
  displayName: 'Customer welcome / onboarding',
  previewData: { name: 'Jane', merchantName: 'Acme Corp', dashboardUrl: 'https://mzzpay.io/dashboard' },
} satisfies TemplateEntry

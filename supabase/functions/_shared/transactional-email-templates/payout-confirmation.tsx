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
  amount?: string
  currency?: string
  bankLast4?: string
  expectedArrival?: string
}

const PayoutConfirmationEmail = ({ amount = '$0.00', currency = 'USD', bankLast4 = '****', expectedArrival = '1–2 business days' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payout of {amount} initiated</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Payout Initiated</Heading>
        <Text style={text}>Your payout has been submitted and is being processed.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValue}>{amount} {currency}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Bank Account</span> <span style={detailValue}>•••• {bankLast4}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Expected Arrival</span> <span style={detailValue}>{expectedArrival}</span></Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PayoutConfirmationEmail,
  subject: (data: Record<string, any>) => `Payout of ${data.amount || '$0.00'} initiated`,
  displayName: 'Payout confirmation',
  previewData: { amount: '$2,500.00', currency: 'USD', bankLast4: '7890', expectedArrival: '1–2 business days' },
} satisfies TemplateEntry

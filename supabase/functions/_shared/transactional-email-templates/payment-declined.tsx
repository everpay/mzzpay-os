/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, errorBox, detailRow, detailLabel, detailValue, detailValueRed,
  detailValueMono, hr, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  transactionId?: string
  reason?: string
  merchantName?: string
}

const PaymentDeclinedEmail = ({ amount = '$0.00', currency = 'USD', transactionId = 'N/A', reason, merchantName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment of {amount} was declined</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Payment Declined</Heading>
        <Text style={text}>We were unable to process your payment. Please review the details below and try again or update your payment method.</Text>
        <Section style={errorBox}>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValueRed}>{amount} {currency}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Transaction ID</span> <span style={detailValueMono}>{transactionId}</span></Text>
          {reason && <Text style={detailRow}><span style={detailLabel}>Reason</span> <span style={detailValue}>{reason}</span></Text>}
          {merchantName && <Text style={detailRow}><span style={detailLabel}>Merchant</span> <span style={detailValue}>{merchantName}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentDeclinedEmail,
  subject: (data: Record<string, any>) => `Payment of ${data.amount || '$0.00'} was declined`,
  displayName: 'Payment declined',
  previewData: { amount: '$150.00', currency: 'USD', transactionId: 'txn_abc123', reason: 'Insufficient funds' },
} satisfies TemplateEntry

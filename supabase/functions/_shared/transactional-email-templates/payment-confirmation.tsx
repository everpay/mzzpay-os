/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, detailsBox, detailRow, detailLabel, detailValue, detailValueMono,
  hr, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  transactionId?: string
  date?: string
  merchantName?: string
  paymentMethod?: string
}

const PaymentConfirmationEmail = ({ amount = '$0.00', currency = 'USD', transactionId = 'N/A', date, merchantName, paymentMethod }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment of {amount} confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Payment Confirmed</Heading>
        <Text style={text}>Your payment has been processed successfully.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValue}>{amount} {currency}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Transaction ID</span> <span style={detailValueMono}>{transactionId}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Date</span> <span style={detailValue}>{date || new Date().toLocaleDateString()}</span></Text>
          {paymentMethod && <Text style={detailRow}><span style={detailLabel}>Method</span> <span style={detailValue}>{paymentMethod}</span></Text>}
          {merchantName && <Text style={detailRow}><span style={detailLabel}>Merchant</span> <span style={detailValue}>{merchantName}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentConfirmationEmail,
  subject: (data: Record<string, any>) => `Payment of ${data.amount || '$0.00'} confirmed`,
  displayName: 'Payment confirmation',
  previewData: { amount: '$150.00', currency: 'USD', transactionId: 'txn_abc123', paymentMethod: 'Visa •••• 4242' },
} satisfies TemplateEntry

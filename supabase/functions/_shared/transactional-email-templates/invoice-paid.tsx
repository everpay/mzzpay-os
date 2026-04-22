/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, successBox, detailRow, detailLabel, detailValue, detailValueGreen,
  hr, footer,
} from './_shared-styles.ts'

interface Props {
  invoiceNumber?: string
  amount?: string
  currency?: string
  paidDate?: string
}

const InvoicePaidEmail = ({ invoiceNumber = 'INV-000000', amount = '$0.00', currency = 'USD', paidDate }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Invoice {invoiceNumber} has been paid</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Invoice Paid</Heading>
        <Text style={text}>Great news — your invoice has been paid in full.</Text>
        <Section style={successBox}>
          <Text style={detailRow}><span style={detailLabel}>Invoice</span> <span style={detailValue}>{invoiceNumber}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Amount Paid</span> <span style={detailValueGreen}>{amount} {currency}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Paid On</span> <span style={detailValue}>{paidDate || new Date().toLocaleDateString()}</span></Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoicePaidEmail,
  subject: (data: Record<string, any>) => `Invoice ${data.invoiceNumber || 'INV-000000'} paid`,
  displayName: 'Invoice paid',
  previewData: { invoiceNumber: 'INV-001234', amount: '$500.00', currency: 'USD', paidDate: 'Jan 28, 2026' },
} satisfies TemplateEntry

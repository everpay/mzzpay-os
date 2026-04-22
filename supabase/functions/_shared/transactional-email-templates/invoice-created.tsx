/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, detailsBox, detailRow, detailLabel, detailValue, button, hr, footer,
} from './_shared-styles.ts'

interface Props {
  invoiceNumber?: string
  amount?: string
  currency?: string
  dueDate?: string
  merchantName?: string
  payUrl?: string
}

const InvoiceCreatedEmail = ({ invoiceNumber = 'INV-000000', amount = '$0.00', currency = 'USD', dueDate, merchantName, payUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Invoice {invoiceNumber} for {amount}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>New Invoice</Heading>
        <Text style={text}>A new invoice has been created for your review.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Invoice</span> <span style={detailValue}>{invoiceNumber}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Amount Due</span> <span style={detailValue}>{amount} {currency}</span></Text>
          {dueDate && <Text style={detailRow}><span style={detailLabel}>Due Date</span> <span style={detailValue}>{dueDate}</span></Text>}
          {merchantName && <Text style={detailRow}><span style={detailLabel}>From</span> <span style={detailValue}>{merchantName}</span></Text>}
        </Section>
        {payUrl && <Button href={payUrl} style={button}>Pay Invoice</Button>}
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceCreatedEmail,
  subject: (data: Record<string, any>) => `Invoice ${data.invoiceNumber || 'INV-000000'} — ${data.amount || '$0.00'} due`,
  displayName: 'Invoice created',
  previewData: { invoiceNumber: 'INV-001234', amount: '$500.00', currency: 'USD', dueDate: 'Jan 30, 2026', merchantName: 'Acme Corp', payUrl: 'https://mzzpay.io/pay/INV-001234' },
} satisfies TemplateEntry

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, shortId,
  main, container, heroBanner, heroLogoImg, heroLogoText, heroHeading, heroSubtext,
  bodySection, detailsTable, detailRow, detailLabelCol, detailValueCol,
  detailLabel, detailValue, detailValueMono, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  transactionId?: string
  reason?: string
  customerName?: string
}

const RefundConfirmationEmail = ({ amount = '0.00', currency = 'USD', transactionId = 'N/A', reason, customerName }: Props) => {
  const displayId = shortId(transactionId)
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'

  const rows: Array<[string, string | undefined]> = [
    ['Reference Number', displayId],
    ['Refund Amount', `${amount} ${currency}`],
    ['Reason', reason],
    ['Expected Return', '5–10 business days'],
    ['Status', 'Refunded'],
  ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Refund of {amount} {currency} processed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={heroBanner}>
            <Img src={LOGO_URL} width="36" height="36" alt={SITE_NAME} style={heroLogoImg} />
            <span style={heroLogoText}>{SITE_NAME}</span>
            <Heading as="h1" style={heroHeading}>Refund{'\n'}Processed</Heading>
            <Text style={heroSubtext}>{greeting}</Text>
            <Text style={{ ...heroSubtext, marginTop: '12px' }}>
              A refund of {amount} {currency} has been processed to your original payment method.
            </Text>
          </Section>
          <Section style={bodySection}>
            <Section style={detailsTable}>
              {rows.map(([label, value]) => value ? (
                <Row key={label} style={detailRow}>
                  <Column style={detailLabelCol}><span style={detailLabel}>{label}</span></Column>
                  <Column style={detailValueCol}><span style={label === 'Reference Number' ? detailValueMono : detailValue}>{value}</span></Column>
                </Row>
              ) : null)}
            </Section>
          </Section>
          <Text style={footer}>This is an automated notification from {SITE_NAME}. Do not reply to this email.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RefundConfirmationEmail,
  subject: (data: Record<string, any>) => `Refund Processed — ${data.amount || '0.00'} ${data.currency || 'USD'}`,
  displayName: 'Refund confirmation',
  previewData: { amount: '75.00', currency: 'USD', transactionId: 'txn_ref456abc789', reason: 'Customer request' },
} satisfies TemplateEntry

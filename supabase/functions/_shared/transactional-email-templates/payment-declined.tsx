/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, shortId,
  main, container, heroLogoImg, heroLogoText, heroHeading, heroSubtext,
  bodySection, detailsTable, detailRow, detailLabelCol, detailValueCol,
  detailLabel, detailValue, detailValueRed, detailValueMono, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  transactionId?: string
  reason?: string
  errorCode?: string
  merchantName?: string
  customerName?: string
  cardLast4?: string
  cardBrand?: string
}

const declinedBanner = {
  background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ef4444 100%)',
  padding: '36px 28px 32px',
  textAlign: 'center' as const,
} as const

const PaymentDeclinedEmail = ({
  amount = '0.00', currency = 'USD', transactionId = 'N/A',
  reason, merchantName, customerName, cardLast4, cardBrand,
}: Props) => {
  const displayId = shortId(transactionId)
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'

  const rows: Array<[string, string | undefined]> = [
    ['Reference Number', displayId],
    ['Amount', `${amount} ${currency}`],
    ['Status', 'Declined'],
    ['Reason', reason],
    ['Payment Method', cardBrand && cardLast4 ? `${cardLast4} - ${cardBrand.toUpperCase()}` : undefined],
    ['Merchant', merchantName],
  ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Payment of {amount} {currency} was declined</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={declinedBanner}>
            <Img src={LOGO_URL} width="36" height="36" alt={SITE_NAME} style={heroLogoImg} />
            <span style={heroLogoText}>{SITE_NAME}</span>
            <Heading as="h1" style={heroHeading}>Payment{'\n'}Declined</Heading>
            <Text style={heroSubtext}>{greeting}</Text>
            <Text style={{ ...heroSubtext, marginTop: '12px' }}>
              We were unable to process your payment of {amount} {currency}. Please try again or use a different payment method.
            </Text>
          </Section>

          <Section style={bodySection}>
            <Section style={detailsTable}>
              {rows.map(([label, value]) =>
                value ? (
                  <Row key={label} style={detailRow}>
                    <Column style={detailLabelCol}><span style={detailLabel}>{label}</span></Column>
                    <Column style={detailValueCol}>
                      <span style={label === 'Status' ? detailValueRed : (label === 'Reference Number' ? detailValueMono : detailValue)}>{value}</span>
                    </Column>
                  </Row>
                ) : null,
              )}
            </Section>
          </Section>

          <Text style={footer}>This is an automated notification from {SITE_NAME}. Do not reply to this email.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PaymentDeclinedEmail,
  subject: (data: Record<string, any>) =>
    `Payment Declined — ${data.amount || '0.00'} ${data.currency || 'USD'}`,
  displayName: 'Payment declined',
  previewData: { amount: '150.00', currency: 'USD', transactionId: 'txn_abc123def456', reason: 'Insufficient funds', cardLast4: '4242', cardBrand: 'Visa' },
} satisfies TemplateEntry

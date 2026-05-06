/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Img, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL,
  main, container, heroBanner, heroLogoImg, heroLogoText, heroHeading, heroSubtext,
  bodySection, detailsTable, detailRow, detailLabelCol, detailValueCol,
  detailLabel, detailValue, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  bankLast4?: string
  expectedArrival?: string
  customerName?: string
}

const PayoutConfirmationEmail = ({ amount = '0.00', currency = 'USD', bankLast4 = '****', expectedArrival = '1–2 business days', customerName }: Props) => {
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'

  const rows: Array<[string, string | undefined]> = [
    ['Payout Amount', `${amount} ${currency}`],
    ['Bank Account', `•••• ${bankLast4}`],
    ['Expected Arrival', expectedArrival],
    ['Status', 'Initiated'],
  ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Payout of {amount} {currency} initiated</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={heroBanner}>
            <Img src={LOGO_URL} width="36" height="36" alt={SITE_NAME} style={heroLogoImg} />
            <span style={heroLogoText}>{SITE_NAME}</span>
            <Heading as="h1" style={heroHeading}>Payout{'\n'}Initiated</Heading>
            <Text style={heroSubtext}>{greeting}</Text>
            <Text style={{ ...heroSubtext, marginTop: '12px' }}>
              Your payout of {amount} {currency} has been submitted and is being processed.
            </Text>
          </Section>
          <Section style={bodySection}>
            <Section style={detailsTable}>
              {rows.map(([label, value]) => value ? (
                <Row key={label} style={detailRow}>
                  <Column style={detailLabelCol}><span style={detailLabel}>{label}</span></Column>
                  <Column style={detailValueCol}><span style={detailValue}>{value}</span></Column>
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
  component: PayoutConfirmationEmail,
  subject: (data: Record<string, any>) => `Payout Initiated — ${data.amount || '0.00'} ${data.currency || 'USD'}`,
  displayName: 'Payout confirmation',
  previewData: { amount: '2,500.00', currency: 'USD', bankLast4: '7890', expectedArrival: '1–2 business days' },
} satisfies TemplateEntry

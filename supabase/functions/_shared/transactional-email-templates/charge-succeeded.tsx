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
  chargeId?: string
  cardLast4?: string
  cardBrand?: string
  description?: string
  customerName?: string
}

const ChargeSucceededEmail = ({ amount = '0.00', currency = 'USD', chargeId, cardLast4, cardBrand, description, customerName }: Props) => {
  const displayId = shortId(chargeId)
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'
  const cardDisplay = cardBrand && cardLast4 ? `${cardLast4} - ${cardBrand.toUpperCase()}` : undefined

  const rows: Array<[string, string | undefined]> = [
    ['Reference Number', displayId],
    ['Amount', `${amount} ${currency}`],
    ['Payment Method', cardDisplay],
    ['Description', description],
    ['Status', 'Captured'],
  ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Charge of {amount} {currency} captured</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={heroBanner}>
            <Img src={LOGO_URL} width="36" height="36" alt={SITE_NAME} style={heroLogoImg} />
            <span style={heroLogoText}>{SITE_NAME}</span>
            <Heading as="h1" style={heroHeading}>Charge{'\n'}Captured</Heading>
            <Text style={heroSubtext}>{greeting}</Text>
            <Text style={{ ...heroSubtext, marginTop: '12px' }}>
              A charge of {amount} {currency} was successfully captured.
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
          <Text style={footer}>This is an automated receipt from {SITE_NAME}. Do not reply to this email.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ChargeSucceededEmail,
  subject: (data: Record<string, any>) => `Charge Captured — ${data.amount || '0.00'} ${data.currency || 'USD'}`,
  displayName: 'Charge succeeded',
  previewData: { amount: '129.00', currency: 'USD', chargeId: 'ch_abc123def456', cardLast4: '4242', cardBrand: 'Visa', description: 'Pro plan upgrade' },
} satisfies TemplateEntry

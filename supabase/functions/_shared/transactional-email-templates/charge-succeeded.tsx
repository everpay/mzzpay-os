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
  chargeId?: string
  cardLast4?: string
  cardBrand?: string
  description?: string
}

const ChargeSucceededEmail = ({ amount = '$0.00', currency = 'USD', chargeId, cardLast4, cardBrand, description }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Charge of {amount} succeeded</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Charge Succeeded</Heading>
        <Text style={text}>A new charge was successfully captured on your account.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValue}>{amount} {currency}</span></Text>
          {description && <Text style={detailRow}><span style={detailLabel}>Description</span> <span style={detailValue}>{description}</span></Text>}
          {cardBrand && cardLast4 && <Text style={detailRow}><span style={detailLabel}>Card</span> <span style={detailValue}>{cardBrand} •••• {cardLast4}</span></Text>}
          {chargeId && <Text style={detailRow}><span style={detailLabel}>Charge ID</span> <span style={detailValueMono}>{chargeId}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ChargeSucceededEmail,
  subject: (data: Record<string, any>) => `Charge of ${data.amount || '$0.00'} succeeded`,
  displayName: 'Charge succeeded',
  previewData: { amount: '$129.00', currency: 'USD', chargeId: 'ch_abc123', cardLast4: '4242', cardBrand: 'Visa', description: 'Pro plan upgrade' },
} satisfies TemplateEntry

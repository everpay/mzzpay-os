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
  detailLabel, detailValue, detailValueGreen, detailValueMono, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  settlementDate?: string
  transactionCount?: string
  settlementId?: string
}

const SettlementReadyEmail = ({ amount = '0.00', currency = 'USD', settlementDate, transactionCount, settlementId }: Props) => {
  const displayId = shortId(settlementId)

  const rows: Array<[string, string | undefined]> = [
    ['Net Amount', `${amount} ${currency}`],
    ['Transactions', transactionCount],
    ['Settlement Date', settlementDate],
    ['Settlement ID', displayId !== 'N/A' ? displayId : undefined],
    ['Status', 'Ready for Payout'],
  ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Settlement of {amount} {currency} ready for payout</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={heroBanner}>
            <Img src={LOGO_URL} width="36" height="36" alt={SITE_NAME} style={heroLogoImg} />
            <span style={heroLogoText}>{SITE_NAME}</span>
            <Heading as="h1" style={heroHeading}>Settlement{'\n'}Ready</Heading>
            <Text style={heroSubtext}>
              Your settlement batch has been finalized and is ready for payout to your bank account.
            </Text>
          </Section>
          <Section style={bodySection}>
            <Section style={detailsTable}>
              {rows.map(([label, value]) => value ? (
                <Row key={label} style={detailRow}>
                  <Column style={detailLabelCol}><span style={detailLabel}>{label}</span></Column>
                  <Column style={detailValueCol}>
                    <span style={label === 'Net Amount' ? detailValueGreen : (label === 'Settlement ID' ? detailValueMono : detailValue)}>{value}</span>
                  </Column>
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
  component: SettlementReadyEmail,
  subject: (data: Record<string, any>) => `Settlement Ready — ${data.amount || '0.00'} ${data.currency || 'USD'}`,
  displayName: 'Settlement ready',
  previewData: { amount: '12,450.78', currency: 'USD', settlementDate: 'May 06, 2026', transactionCount: '342', settlementId: 'set_xyz789abc123' },
} satisfies TemplateEntry

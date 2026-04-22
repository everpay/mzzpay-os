/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, successBox, detailRow, detailLabel, detailValue, detailValueGreen,
  detailValueMono, hr, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  settlementDate?: string
  transactionCount?: string
  settlementId?: string
}

const SettlementReadyEmail = ({ amount = '$0.00', currency = 'USD', settlementDate, transactionCount, settlementId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Settlement of {amount} ready for payout</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Settlement Ready</Heading>
        <Text style={text}>Your settlement batch has been finalized and is ready for payout to your bank account.</Text>
        <Section style={successBox}>
          <Text style={detailRow}><span style={detailLabel}>Net Amount</span> <span style={detailValueGreen}>{amount} {currency}</span></Text>
          {transactionCount && <Text style={detailRow}><span style={detailLabel}>Transactions</span> <span style={detailValue}>{transactionCount}</span></Text>}
          {settlementDate && <Text style={detailRow}><span style={detailLabel}>Settlement Date</span> <span style={detailValue}>{settlementDate}</span></Text>}
          {settlementId && <Text style={detailRow}><span style={detailLabel}>Settlement ID</span> <span style={detailValueMono}>{settlementId}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SettlementReadyEmail,
  subject: (data: Record<string, any>) => `Settlement of ${data.amount || '$0.00'} ready`,
  displayName: 'Settlement ready',
  previewData: { amount: '$12,450.78', currency: 'USD', settlementDate: 'Apr 18, 2026', transactionCount: '342', settlementId: 'set_xyz789' },
} satisfies TemplateEntry

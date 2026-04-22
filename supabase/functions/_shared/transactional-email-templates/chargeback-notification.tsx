/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, warningBox, detailRow, detailLabel, detailValue, detailValueRed,
  detailValueMono, hr, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  transactionId?: string
  reason?: string
  evidenceDueDate?: string
  disputeId?: string
}

const ChargebackNotificationEmail = ({ amount = '$0.00', currency = 'USD', transactionId = 'N/A', reason, evidenceDueDate, disputeId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Chargeback received — {amount} {currency}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Chargeback Received</Heading>
        <Text style={text}>A chargeback has been filed against one of your transactions. Please review the details and submit evidence before the deadline.</Text>
        <Section style={warningBox}>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValueRed}>{amount} {currency}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Transaction ID</span> <span style={detailValueMono}>{transactionId}</span></Text>
          {disputeId && <Text style={detailRow}><span style={detailLabel}>Dispute ID</span> <span style={detailValue}>{disputeId}</span></Text>}
          {reason && <Text style={detailRow}><span style={detailLabel}>Reason</span> <span style={detailValue}>{reason}</span></Text>}
          {evidenceDueDate && <Text style={detailRow}><span style={detailLabel}>Evidence Due</span> <span style={detailValueRed}>{evidenceDueDate}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}. Respond promptly to avoid losing the dispute.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ChargebackNotificationEmail,
  subject: (data: Record<string, any>) => `Chargeback received — ${data.amount || '$0.00'}`,
  displayName: 'Chargeback notification',
  previewData: { amount: '$250.00', currency: 'USD', transactionId: 'txn_xyz789', reason: 'Fraudulent', evidenceDueDate: 'Feb 15, 2026', disputeId: 'dsp_001' },
} satisfies TemplateEntry

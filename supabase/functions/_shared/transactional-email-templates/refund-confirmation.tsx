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
  transactionId?: string
  reason?: string
}

const RefundConfirmationEmail = ({ amount = '$0.00', currency = 'USD', transactionId = 'N/A', reason }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Refund of {amount} processed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Refund Processed</Heading>
        <Text style={text}>A refund has been processed and will be returned to the original payment method.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Refund Amount</span> <span style={detailValue}>{amount} {currency}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Original Transaction</span> <span style={detailValueMono}>{transactionId}</span></Text>
          {reason && <Text style={detailRow}><span style={detailLabel}>Reason</span> <span style={detailValue}>{reason}</span></Text>}
          <Text style={detailRow}><span style={detailLabel}>Expected Return</span> <span style={detailValue}>5–10 business days</span></Text>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RefundConfirmationEmail,
  subject: (data: Record<string, any>) => `Refund of ${data.amount || '$0.00'} processed`,
  displayName: 'Refund confirmation',
  previewData: { amount: '$75.00', currency: 'USD', transactionId: 'txn_ref456', reason: 'Customer request' },
} satisfies TemplateEntry

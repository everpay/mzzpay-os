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
  sender?: string
  reference?: string
  receivedAt?: string
}

const TransferReceivedEmail = ({ amount = '$0.00', currency = 'USD', sender, reference, receivedAt }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Incoming transfer of {amount} received</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Transfer Received</Heading>
        <Text style={text}>Funds have been credited to your account.</Text>
        <Section style={successBox}>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValueGreen}>+{amount} {currency}</span></Text>
          {sender && <Text style={detailRow}><span style={detailLabel}>From</span> <span style={detailValue}>{sender}</span></Text>}
          {receivedAt && <Text style={detailRow}><span style={detailLabel}>Received</span> <span style={detailValue}>{receivedAt}</span></Text>}
          {reference && <Text style={detailRow}><span style={detailLabel}>Reference</span> <span style={detailValueMono}>{reference}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TransferReceivedEmail,
  subject: (data: Record<string, any>) => `Transfer of ${data.amount || '$0.00'} received`,
  displayName: 'Transfer received',
  previewData: { amount: '$2,450.00', currency: 'USD', sender: 'MzzPay Payouts', reference: 'TRF-IN-552', receivedAt: 'Today at 9:14 AM' },
} satisfies TemplateEntry

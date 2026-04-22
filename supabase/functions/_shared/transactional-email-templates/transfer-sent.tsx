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
  recipient?: string
  reference?: string
  expectedArrival?: string
}

const TransferSentEmail = ({ amount = '$0.00', currency = 'USD', recipient, reference, expectedArrival }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Transfer of {amount} sent</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Transfer Sent</Heading>
        <Text style={text}>Your outbound transfer has been submitted for processing.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValue}>{amount} {currency}</span></Text>
          {recipient && <Text style={detailRow}><span style={detailLabel}>Recipient</span> <span style={detailValue}>{recipient}</span></Text>}
          {expectedArrival && <Text style={detailRow}><span style={detailLabel}>Expected Arrival</span> <span style={detailValue}>{expectedArrival}</span></Text>}
          {reference && <Text style={detailRow}><span style={detailLabel}>Reference</span> <span style={detailValueMono}>{reference}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TransferSentEmail,
  subject: (data: Record<string, any>) => `Transfer of ${data.amount || '$0.00'} sent`,
  displayName: 'Transfer sent',
  previewData: { amount: '$5,000.00', currency: 'USD', recipient: 'Acme Vendor LLC', reference: 'TRF-OUT-001', expectedArrival: '1–2 business days' },
} satisfies TemplateEntry

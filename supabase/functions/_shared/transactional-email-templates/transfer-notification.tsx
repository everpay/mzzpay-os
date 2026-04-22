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
  fromAccount?: string
  toAccount?: string
  reference?: string
}

const TransferNotificationEmail = ({ amount = '$0.00', currency = 'USD', fromAccount, toAccount, reference }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Transfer of {amount} completed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Transfer Completed</Heading>
        <Text style={text}>A fund transfer has been successfully processed.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValue}>{amount} {currency}</span></Text>
          {fromAccount && <Text style={detailRow}><span style={detailLabel}>From</span> <span style={detailValue}>{fromAccount}</span></Text>}
          {toAccount && <Text style={detailRow}><span style={detailLabel}>To</span> <span style={detailValue}>{toAccount}</span></Text>}
          {reference && <Text style={detailRow}><span style={detailLabel}>Reference</span> <span style={detailValueMono}>{reference}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TransferNotificationEmail,
  subject: (data: Record<string, any>) => `Transfer of ${data.amount || '$0.00'} completed`,
  displayName: 'Transfer notification',
  previewData: { amount: '$1,000.00', currency: 'USD', fromAccount: 'Operating •••• 1234', toAccount: 'Reserve •••• 5678', reference: 'TRF-98765' },
} satisfies TemplateEntry

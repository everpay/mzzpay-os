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
  planName?: string
  amount?: string
  currency?: string
  periodEnd?: string
  invoiceId?: string
}

const SubscriptionRenewedEmail = ({ planName = 'Subscription', amount = '$0.00', currency = 'USD', periodEnd, invoiceId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {planName} subscription renewed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Subscription Renewed</Heading>
        <Text style={text}>Your subscription has been renewed for the next billing period.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Plan</span> <span style={detailValue}>{planName}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Amount Charged</span> <span style={detailValue}>{amount} {currency}</span></Text>
          {periodEnd && <Text style={detailRow}><span style={detailLabel}>Active Through</span> <span style={detailValue}>{periodEnd}</span></Text>}
          {invoiceId && <Text style={detailRow}><span style={detailLabel}>Invoice</span> <span style={detailValueMono}>{invoiceId}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionRenewedEmail,
  subject: (data: Record<string, any>) => `${data.planName || 'Subscription'} renewed`,
  displayName: 'Subscription renewed',
  previewData: { planName: 'Pro Plan', amount: '$49.00', currency: 'USD', periodEnd: 'June 17, 2026', invoiceId: 'inv_998877' },
} satisfies TemplateEntry

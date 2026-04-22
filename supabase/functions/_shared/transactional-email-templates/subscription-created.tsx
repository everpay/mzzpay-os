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
  interval?: string
  nextBillingDate?: string
  subscriptionId?: string
}

const SubscriptionCreatedEmail = ({ planName = 'Subscription', amount = '$0.00', currency = 'USD', interval = 'monthly', nextBillingDate, subscriptionId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {planName} subscription is active</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Subscription Activated</Heading>
        <Text style={text}>Welcome aboard! Your subscription is now active and ready to use.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Plan</span> <span style={detailValue}>{planName}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValue}>{amount} {currency} / {interval}</span></Text>
          {nextBillingDate && <Text style={detailRow}><span style={detailLabel}>Next Billing</span> <span style={detailValue}>{nextBillingDate}</span></Text>}
          {subscriptionId && <Text style={detailRow}><span style={detailLabel}>Subscription ID</span> <span style={detailValueMono}>{subscriptionId}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionCreatedEmail,
  subject: (data: Record<string, any>) => `${data.planName || 'Subscription'} is now active`,
  displayName: 'Subscription created',
  previewData: { planName: 'Pro Plan', amount: '$49.00', currency: 'USD', interval: 'month', nextBillingDate: 'May 17, 2026', subscriptionId: 'sub_abc123' },
} satisfies TemplateEntry

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
  endsAt?: string
  reason?: string
  subscriptionId?: string
}

const SubscriptionCanceledEmail = ({ planName = 'Subscription', endsAt, reason, subscriptionId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {planName} subscription was canceled</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Subscription Canceled</Heading>
        <Text style={text}>Your subscription has been canceled. You'll continue to have access until the end of your current billing period.</Text>
        <Section style={detailsBox}>
          <Text style={detailRow}><span style={detailLabel}>Plan</span> <span style={detailValue}>{planName}</span></Text>
          {endsAt && <Text style={detailRow}><span style={detailLabel}>Access Ends</span> <span style={detailValue}>{endsAt}</span></Text>}
          {reason && <Text style={detailRow}><span style={detailLabel}>Reason</span> <span style={detailValue}>{reason}</span></Text>}
          {subscriptionId && <Text style={detailRow}><span style={detailLabel}>Subscription ID</span> <span style={detailValueMono}>{subscriptionId}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionCanceledEmail,
  subject: (data: Record<string, any>) => `${data.planName || 'Subscription'} canceled`,
  displayName: 'Subscription canceled',
  previewData: { planName: 'Pro Plan', endsAt: 'May 17, 2026', reason: 'Customer request', subscriptionId: 'sub_abc123' },
} satisfies TemplateEntry

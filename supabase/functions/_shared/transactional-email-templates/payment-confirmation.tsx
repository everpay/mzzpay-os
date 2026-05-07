/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img, Button, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, shortId,
  main, container, heroBanner, heroLogoImg, heroLogoText, heroHeading, heroSubtext,
  bodySection, detailsTable, detailRow, detailLabelCol, detailValueCol,
  detailLabel, detailValue, detailValueMono, detailValueRed, detailValueGreen, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  transactionId?: string
  orderId?: string
  type?: string
  date?: string
  status?: string
  method?: string
  description?: string
  merchantName?: string
  paymentMethod?: string
  receiptUrl?: string
  pdfUrl?: string
  descriptor?: string
  supportEmail?: string
  cardLast4?: string
  cardBrand?: string
  customerName?: string
  errorCode?: string
  errorMessage?: string
}

const declinedBanner = {
  background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #ef4444 100%)',
  padding: '36px 28px 32px',
  textAlign: 'center' as const,
} as const

const PaymentConfirmationEmail = ({
  amount = '0.00',
  currency = 'USD',
  transactionId = 'N/A',
  orderId,
  type = 'Payment',
  date,
  status = 'Approved',
  method,
  description,
  merchantName,
  paymentMethod,
  receiptUrl,
  pdfUrl,
  descriptor,
  supportEmail,
  cardLast4,
  cardBrand,
  customerName,
  errorCode,
  errorMessage,
}: Props) => {
  const resolvedMethod = method || paymentMethod
  const resolvedDate = date || new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
  const displayId = shortId(orderId || transactionId)
  const greeting = customerName ? `Hi ${customerName},` : 'Hi there,'
  const cardDisplay = cardBrand && cardLast4 ? `${cardLast4} - ${cardBrand.toUpperCase()}` : resolvedMethod

  const isDeclined = status?.toLowerCase() === 'declined' || status?.toLowerCase() === 'failed'
  const heroTitle = isDeclined ? 'Transaction\nDeclined' : 'Transaction\nSuccessful'
  const bannerStyle = isDeclined ? declinedBanner : heroBanner

  const heroBody = isDeclined
    ? `We were unable to process your ${type} of ${amount} ${currency}.${errorMessage ? ` Reason: ${errorMessage}` : ''}${errorCode ? ` (Code: ${errorCode})` : ''}`
    : `You've successfully completed a ${type} of ${amount} ${currency}.`

  const rows: Array<[string, string | undefined, 'mono' | 'red' | 'green' | 'default']> = [
    ['Reference Number', displayId, 'mono'],
    ['Card Number ending', cardLast4, 'default'],
    ['Payment Method', cardDisplay, 'default'],
    ['Amount', `${amount} ${currency}`, 'default'],
    ['Date', resolvedDate, 'default'],
    ['Status', status, isDeclined ? 'red' : 'green'],
    ['Type', type, 'default'],
    ['Description', description, 'default'],
  ]

  if (isDeclined && errorCode) {
    rows.push(['Error Code', errorCode, 'red'])
  }
  if (isDeclined && errorMessage) {
    rows.push(['Reason', errorMessage, 'red'])
  }

  const styleMap = { mono: detailValueMono, red: detailValueRed, green: detailValueGreen, default: detailValue }

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{isDeclined ? `Payment Declined — ${amount} ${currency}` : `Payment of ${amount} ${currency} completed`}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Hero gradient banner */}
          <Section style={bannerStyle}>
            <Img src={LOGO_URL} width="36" height="36" alt={SITE_NAME} style={heroLogoImg} />
            <span style={heroLogoText}>{SITE_NAME}</span>

            <Heading as="h1" style={heroHeading}>
              {heroTitle}
            </Heading>

            <Text style={heroSubtext}>
              {greeting}
            </Text>
            <Text style={{ ...heroSubtext, marginTop: '12px' }}>
              {heroBody}
            </Text>
            {!isDeclined && (
              <Text style={{ ...heroSubtext, marginTop: '12px' }}>
                See details of your transaction below.
              </Text>
            )}
          </Section>

          {/* Detail rows */}
          <Section style={bodySection}>
            <Section style={detailsTable}>
              {rows.map(([label, value, variant]) =>
                value ? (
                  <Row key={label} style={detailRow}>
                    <Column style={detailLabelCol}>
                      <span style={detailLabel}>{label}</span>
                    </Column>
                    <Column style={detailValueCol}>
                      <span style={styleMap[variant]}>{value}</span>
                    </Column>
                  </Row>
                ) : null,
              )}
            </Section>

            {descriptor && !isDeclined && (
              <Text style={descriptorNote}>
                This charge will appear on your statement as{' '}
                <strong style={descriptorMark}>{descriptor}</strong>
                {supportEmail ? (
                  <>
                    . Questions? Email{' '}
                    <a href={`mailto:${supportEmail}`} style={descriptorLink}>{supportEmail}</a>
                  </>
                ) : '.'}
              </Text>
            )}

            {!isDeclined && (pdfUrl || receiptUrl) && (
              <Row style={{ marginTop: '20px', textAlign: 'center' as const }}>
                {pdfUrl && (
                  <Column align="center" style={{ paddingRight: receiptUrl ? '6px' : 0 }}>
                    <Button href={pdfUrl} style={secondaryBtn}>Save as PDF</Button>
                  </Column>
                )}
                {receiptUrl && (
                  <Column align="center" style={{ paddingLeft: pdfUrl ? '6px' : 0 }}>
                    <Button href={receiptUrl} style={secondaryBtn}>View Receipt</Button>
                  </Column>
                )}
              </Row>
            )}

            {merchantName && (
              <Text style={smallNote}>Issued by <strong>{merchantName}</strong></Text>
            )}
          </Section>

          <Text style={footer}>
            This is an automated receipt from {SITE_NAME}. Do not reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const secondaryBtn = {
  display: 'inline-block',
  backgroundColor: '#f1f5f9',
  color: '#334155',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '10px 18px',
  fontSize: '13px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  fontFamily: "'Manrope', 'Helvetica Neue', Arial, sans-serif",
} as const

const smallNote = {
  fontSize: '12px',
  color: '#64748b',
  textAlign: 'center' as const,
  margin: '16px 0 0',
} as const

const descriptorNote = {
  fontSize: '12px',
  color: '#475569',
  lineHeight: '1.55',
  textAlign: 'center' as const,
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '10px 12px',
  margin: '18px 0 0',
} as const

const descriptorMark = {
  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  fontSize: '12px',
  color: '#0f172a',
} as const

const descriptorLink = {
  color: '#0f172a',
  textDecoration: 'underline',
} as const

export const template = {
  component: PaymentConfirmationEmail,
  subject: (data: Record<string, any>) => {
    const isDeclined = data.status?.toLowerCase() === 'declined' || data.status?.toLowerCase() === 'failed'
    if (isDeclined) {
      return `Payment Declined — ${data.amount || '0.00'} ${data.currency || 'USD'}${data.errorCode ? ` — ${data.errorCode}` : ''}`
    }
    return `Payment Approved — ${data.amount || '0.00'} ${data.currency || 'USD'} — Receipt #${data.transactionId ? data.transactionId.slice(-8).toUpperCase() : 'N/A'}`
  },
  displayName: 'Payment confirmation',
  previewData: {
    amount: '500.00',
    currency: 'USD',
    transactionId: 'tx-31fa59ff013aac831c1ef0b7f32',
    orderId: 'ord_8821',
    type: 'Card payment',
    date: '01 May 2026',
    status: 'Approved',
    cardBrand: 'Visa',
    cardLast4: '6865',
    merchantName: 'MzzPay Demo Merchant',
    customerName: 'John',
    receiptUrl: 'https://mzzpay.io/receipts/tx-31fa59ff013aac831c1ef0b7f32',
    pdfUrl: 'https://sprjfzeyyihtfvxnfuhb.supabase.co/functions/v1/render-receipt-pdf?id=tx-31fa59ff013aac831c1ef0b7f32',
    descriptor: 'AXP*FER*AXP*FERES',
    supportEmail: 'support@mzzpay.io',
  },
} satisfies TemplateEntry

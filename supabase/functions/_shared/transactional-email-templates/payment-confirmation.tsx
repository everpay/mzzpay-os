/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img, Button, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText, hr, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  transactionId?: string
  orderId?: string
  type?: string
  commissionAmount?: string
  commissionCurrency?: string
  date?: string
  status?: string
  method?: string
  description?: string
  merchantName?: string
  paymentMethod?: string
  receiptUrl?: string
  pdfUrl?: string
  // Soft / statement descriptor — what the customer will see on their
  // bank or card statement. Surfacing this in the email prevents
  // chargebacks from "I don't recognize this charge" disputes.
  descriptor?: string
  supportEmail?: string
}

// Layout mirrors the acquirer-style receipt: a centered card with the
// transaction id headline, a bordered details table with right-aligned
// values, and two side-by-side action buttons. Plain HTML tables are used
// for column alignment so it renders consistently across email clients.
const PaymentConfirmationEmail = ({
  amount = '0.00',
  currency = 'USD',
  transactionId = 'N/A',
  orderId,
  type = 'Payment',
  commissionAmount = '0.00',
  commissionCurrency,
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
}: Props) => {
  const resolvedMethod = method || paymentMethod
  const resolvedCommissionCurrency = commissionCurrency || currency
  const resolvedDate = date || new Date().toISOString().replace('T', ' ').slice(0, 19)

  const rows: Array<[string, string | undefined]> = [
    ['Order ID:', orderId || transactionId],
    ['Type:', type],
    ['Amount:', `${amount} (${currency})`],
    ['Commission amount:', `${commissionAmount} (${resolvedCommissionCurrency})`],
    ['Timestamp:', resolvedDate],
    ['Status:', status],
    ['Method:', resolvedMethod],
    ['Description:', description],
    ['Statement descriptor:', descriptor],
  ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Receipt for {amount} {currency}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
            <span style={logoText}>{SITE_NAME}</span>
          </Section>

          {/* Receipt card */}
          <Section style={receiptCard}>
            <Heading as="h2" style={receiptHeading}>Receipt</Heading>

            <Text style={txIdLine}># {transactionId}</Text>

            <Section style={detailsTable}>
              {rows.map(([label, value]) =>
                value ? (
                  <Row key={label} style={detailRow}>
                    <Column style={detailLabelCol}>
                      <span style={detailLabel}>{label}</span>
                    </Column>
                    <Column style={detailValueCol}>
                      <span style={detailValue}>{value}</span>
                    </Column>
                  </Row>
                ) : null,
              )}
            </Section>

            {(pdfUrl || receiptUrl) && (
              <Row style={{ marginTop: '20px' }}>
                {pdfUrl && (
                  <Column align="center" style={{ paddingRight: receiptUrl ? '6px' : 0 }}>
                    <Button href={pdfUrl} style={secondaryBtn}>Save as PDF</Button>
                  </Column>
                )}
                {receiptUrl && (
                  <Column align="center" style={{ paddingLeft: pdfUrl ? '6px' : 0 }}>
                    <Button href={receiptUrl} style={secondaryBtn}>Copy link</Button>
                  </Column>
                )}
              </Row>
            )}

            {/* Statement-descriptor explainer. Customers who don't recognise
                the line item on their statement charge back instead of
                contacting support, so we show the exact descriptor string
                and a clear "contact us" path before they dispute. */}
            {descriptor && (
              <Text style={descriptorNote}>
                This charge will appear on your statement as{' '}
                <strong style={descriptorMark}>{descriptor}</strong>
                {supportEmail ? (
                  <>
                    . If you don't recognise it, please email{' '}
                    <a href={`mailto:${supportEmail}`} style={descriptorLink}>{supportEmail}</a>{' '}
                    before disputing.
                  </>
                ) : '.'}
              </Text>
            )}
          </Section>

          {merchantName && (
            <Text style={smallNote}>
              Issued by <strong>{merchantName}</strong>
            </Text>
          )}

          <Hr style={hr} />
          <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
        </Container>
      </Body>
    </Html>
  )
}

// --- Receipt-specific styles (kept local so the template stays self-contained) ---

const receiptCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '24px 24px 20px',
  margin: '0 0 16px',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
} as const

const receiptHeading = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 14px',
  fontFamily: "'Manrope', 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif",
} as const

const txIdLine = {
  textAlign: 'center' as const,
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  padding: '10px 12px',
  margin: '0 0 16px',
  fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
  fontSize: '13px',
  fontWeight: '600' as const,
  color: '#0f172a',
  wordBreak: 'break-all' as const,
} as const

const detailsTable = {
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '0',
} as const

const detailRow = {
  margin: '0',
} as const

const detailLabelCol = {
  width: '45%',
  textAlign: 'right' as const,
  paddingRight: '10px',
  verticalAlign: 'top' as const,
} as const

const detailValueCol = {
  width: '55%',
  textAlign: 'left' as const,
  verticalAlign: 'top' as const,
} as const

const detailLabel = {
  fontSize: '13px',
  color: '#0f172a',
  fontWeight: '600' as const,
  lineHeight: '1.9',
} as const

const detailValue = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.9',
} as const

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
  margin: '0 0 16px',
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
  subject: (data: Record<string, any>) =>
    `Receipt for ${data.amount || '0.00'} ${data.currency || 'USD'}`,
  displayName: 'Payment confirmation',
  previewData: {
    amount: '500.00',
    currency: 'USD',
    transactionId: 'tx-31fa59ff013aac831c1ef0b7f32',
    orderId: 'ord_8821',
    type: 'Card payment',
    commissionAmount: '0.00',
    commissionCurrency: 'USD',
    date: '2026-04-24 23:34:39 (-05:00)',
    status: 'Approved',
    method: 'Visa',
    description: 'Order #8821',
    merchantName: 'MZZPay Demo Merchant',
    receiptUrl: 'https://mzzpay.io/receipts/tx-31fa59ff013aac831c1ef0b7f32',
    pdfUrl: 'https://sprjfzeyyihtfvxnfuhb.supabase.co/functions/v1/render-receipt-pdf?id=tx-31fa59ff013aac831c1ef0b7f32',
    descriptor: 'AXP*FER*AXP*FERES',
    supportEmail: 'support@mzzpay.io',
  },
} satisfies TemplateEntry

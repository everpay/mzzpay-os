/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr, Img,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, successBox, detailRow, detailLabel, detailValue, detailValueGreen,
  hr, footer,
} from './_shared-styles.ts'

interface Props {
  amount?: string
  currency?: string
  destination?: string
  depositType?: string
  network?: string
  walletAddress?: string
}

const DepositConfirmationEmail = ({ amount = '$0.00', currency = 'USD', destination, depositType = 'card', network, walletAddress }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Deposit of {amount} confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="32" height="32" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>Deposit Confirmed</Heading>
        <Text style={text}>Your deposit has been received and credited to your {depositType === 'crypto' ? 'crypto wallet' : 'card account'}.</Text>
        <Section style={successBox}>
          <Text style={detailRow}><span style={detailLabel}>Amount</span> <span style={detailValueGreen}>{amount} {currency}</span></Text>
          <Text style={detailRow}><span style={detailLabel}>Type</span> <span style={detailValue}>{depositType === 'crypto' ? 'Crypto Wallet' : 'Card'}</span></Text>
          {destination && <Text style={detailRow}><span style={detailLabel}>Destination</span> <span style={detailValue}>{destination}</span></Text>}
          {network && <Text style={detailRow}><span style={detailLabel}>Network</span> <span style={detailValue}>{network}</span></Text>}
          {walletAddress && <Text style={detailRow}><span style={detailLabel}>Wallet</span> <span style={{ color: '#0f172a', fontWeight: 600, fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace", fontSize: '11px' }}>{walletAddress}</span></Text>}
        </Section>
        <Hr style={hr} />
        <Text style={footer}>This is an automated notification from {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DepositConfirmationEmail,
  subject: (data: Record<string, any>) => `Deposit of ${data.amount || '$0.00'} confirmed`,
  displayName: 'Deposit confirmation',
  previewData: { amount: '0.5 ETH', currency: 'ETH', depositType: 'crypto', network: 'Ethereum', walletAddress: '0x1234...abcd' },
} satisfies TemplateEntry

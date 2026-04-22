/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Img, Section } from 'npm:@react-email/components@0.0.22'
import { BRAND, styles } from '../email-branding.ts'

/**
 * Reusable MzzPay header: teal "M" mark + wordmark, side-by-side.
 *
 * Email-client compatibility notes:
 *  - We use a small <img> for the icon and an inline-block <span> for the
 *    wordmark. This pattern renders correctly in Gmail (web + iOS),
 *    Outlook 365, Apple Mail, and Yahoo. It also remains legible in
 *    dark-mode clients because the wordmark falls back to the surrounding
 *    text color when the email body is force-inverted.
 *  - vertical-align:middle on both elements keeps them on the same baseline.
 */
export const BrandHeader: React.FC = () => (
  <Section style={styles.logoRow}>
    {/* We render BOTH elements as siblings inside one Section so email clients
        treat them as inline content. */}
    <Img
      src={BRAND.logoIconUrl}
      width="40"
      height="40"
      alt={`${BRAND.name} logo`}
      style={styles.logoImg}
    />
    <span style={styles.logoWordmark}>{BRAND.name}</span>
  </Section>
)

export default BrandHeader

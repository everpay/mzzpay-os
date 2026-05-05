/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import {
  SITE_NAME, LOGO_URL, main, container, logoSection, logoImg, logoText,
  h1, text, button, hr, footer, detailsBox, detailRow, detailLabel, detailValue,
} from './_shared-styles.ts'

interface TeamInviteProps {
  inviteeName?: string
  inviterName?: string
  role?: string
  loginUrl?: string
}

const TeamInviteEmail = ({ inviteeName, inviterName, role, loginUrl }: TeamInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="36" height="36" alt={SITE_NAME} style={logoImg} />
          <span style={logoText}>{SITE_NAME}</span>
        </Section>
        <Heading style={h1}>
          {inviteeName ? `Welcome, ${inviteeName}!` : 'You\'ve been invited!'}
        </Heading>
        <Text style={text}>
          {inviterName ? `${inviterName} has` : 'You have been'} invited you to join <strong>{SITE_NAME}</strong>
          {role ? ` as a ${role.replace(/_/g, ' ')}` : ''}.
        </Text>
        <Section style={detailsBox}>
          <Text style={{ ...detailRow, margin: '4px 0' }}>
            <span style={detailLabel}>Role: </span>
            <span style={detailValue}>{role?.replace(/_/g, ' ') || 'Team Member'}</span>
          </Text>
        </Section>
        <Text style={text}>
          Click the button below to accept the invitation and access your dashboard.
        </Text>
        <Button style={button} href={loginUrl || `https://mzzpay.io/auth`}>
          Accept Invitation
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TeamInviteEmail,
  subject: (data: Record<string, any>) =>
    `You've been invited to join ${SITE_NAME}${data?.role ? ` as ${data.role.replace(/_/g, ' ')}` : ''}`,
  displayName: 'Team invitation',
  previewData: {
    inviteeName: 'Jane Smith',
    inviterName: 'Martin Bishop',
    role: 'admin',
    loginUrl: 'https://mzzpay.io/auth',
  },
} satisfies TemplateEntry

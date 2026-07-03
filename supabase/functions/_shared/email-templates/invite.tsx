/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Img,
  Section,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoWrap}>
          <Img src="https://pendragonx.com/icon-512x512.png" alt="Baku Scribe" width="48" height="48" style={logo} />
          <Text style={brand}>Baku Scribe</Text>
        </Section>
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Click the button below to accept the invitation and create your
          account.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Accept Invitation
        </Button>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logoWrap = { textAlign: 'center' as const, padding: '8px 0 24px', borderBottom: '1px solid #e5e7eb', marginBottom: '28px' }
const logo = { display: 'inline-block', borderRadius: '8px' }
const brand = { fontSize: '13px', fontWeight: '600' as const, color: '#1d2128', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '8px 0 0' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1d2128', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4b5260', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#282d39', textDecoration: 'underline' }
const button = { backgroundColor: '#282d39', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const codeStyle = { fontFamily: 'Menlo, Consolas, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#1d2128', letterSpacing: '0.2em', backgroundColor: '#f3f4f6', padding: '16px 24px', borderRadius: '8px', textAlign: 'center' as const, margin: '0 0 30px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '32px 0 0', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }

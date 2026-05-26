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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoWrap}>
          <Img src="https://pendragonx.com/icon-512x512.png" alt="PendragonX" width="48" height="48" style={logo} />
          <Text style={brand}>PendragonX</Text>
        </Section>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Thanks for signing up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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

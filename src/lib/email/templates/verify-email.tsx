/** @jsxImportSource react */
import { Heading, Link, Text } from '@react-email/components'
import { Button } from '../components/button'
import { EmailLayout } from '../components/email-layout'

const colors = {
  brand: '#D97706',
  foreground: '#171717',
  muted: '#737373',
}

const heading = {
  color: colors.foreground,
  fontSize: '24px',
  fontWeight: '600' as const,
  lineHeight: '1.3',
  margin: '0 0 24px 0',
}

const paragraph = {
  color: colors.foreground,
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
}

const mutedText = {
  color: colors.muted,
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '24px 0 0 0',
}

const linkStyle = {
  color: colors.brand,
  wordBreak: 'break-all' as const,
}

export type VerifyEmailTemplateProps = {
  verificationUrl: string
  logoUrl?: string
}

export function VerifyEmailTemplate({
  verificationUrl,
  logoUrl,
}: VerifyEmailTemplateProps) {
  return (
    <EmailLayout
      preview="Verify your email address to complete your STL Shelf registration"
      logoUrl={logoUrl}
    >
      <Heading style={heading}>Verify your email address</Heading>

      <Text style={paragraph}>
        Thanks for signing up for STL Shelf! To complete your registration and
        start organizing your 3D model library, please verify your email
        address.
      </Text>

      <Text style={paragraph}>
        Click the button below to verify your email:
      </Text>

      <div style={{ textAlign: 'center', margin: '32px 0' }}>
        <Button href={verificationUrl}>Verify Email Address</Button>
      </div>

      <Text style={mutedText}>
        Or copy and paste this link into your browser:
        <br />
        <Link href={verificationUrl} style={linkStyle}>
          {verificationUrl}
        </Link>
      </Text>

      <Text style={{ ...mutedText, marginTop: '32px' }}>
        If you didn't create an account on STL Shelf, you can safely ignore this
        email.
      </Text>
    </EmailLayout>
  )
}

export default VerifyEmailTemplate

/** @jsxImportSource react */
import { Heading, Link, Text } from "@react-email/components";
import { Button } from "../components/button";
import { EmailLayout } from "../components/email-layout";

/**
 * STL Shelf Design System Colors
 * --brand: oklch(0.7043 0.1647 48.73) → #D97706 (orange)
 * --foreground: oklch(0.145 0 0) → #171717
 * --muted-foreground: oklch(0.556 0 0) → #737373
 */
const colors = {
  brand: "#D97706",
  foreground: "#171717",
  muted: "#737373",
};

const heading = {
  color: colors.foreground,
  fontSize: "24px",
  fontWeight: "600" as const,
  lineHeight: "1.3",
  margin: "0 0 24px 0",
};

const paragraph = {
  color: colors.foreground,
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const mutedText = {
  color: colors.muted,
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "24px 0 0 0",
};

const linkStyle = {
  color: colors.brand,
  wordBreak: "break-all" as const,
};

const warningBox = {
  backgroundColor: "#FEF3C7",
  border: "1px solid #F59E0B",
  borderRadius: "10px",
  padding: "16px",
  marginTop: "24px",
};

const warningText = {
  color: "#92400E",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

export type PasswordResetTemplateProps = {
  resetUrl: string;
  logoUrl?: string;
};

export function PasswordResetTemplate({
  resetUrl,
  logoUrl,
}: PasswordResetTemplateProps) {
  return (
    <EmailLayout preview="Reset your STL Shelf password" logoUrl={logoUrl}>
      <Heading style={heading}>Reset your password</Heading>

      <Text style={paragraph}>
        You requested a password reset for your STL Shelf account. Click the
        button below to set a new password:
      </Text>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <Button href={resetUrl}>Reset Password</Button>
      </div>

      <Text style={mutedText}>
        Or copy and paste this link into your browser:
        <br />
        <Link href={resetUrl} style={linkStyle}>
          {resetUrl}
        </Link>
      </Text>

      <div style={warningBox}>
        <Text style={warningText}>
          This link will expire in 1 hour. If you didn't request a password
          reset, you can safely ignore this email — your password will remain
          unchanged.
        </Text>
      </div>
    </EmailLayout>
  );
}

PasswordResetTemplate.PreviewProps = {
  resetUrl: "https://app.stl-shelf.com/reset-password?token=xyz789abc123def456",
} satisfies PasswordResetTemplateProps;

export default PasswordResetTemplate;

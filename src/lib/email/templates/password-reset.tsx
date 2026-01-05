/** @jsxImportSource react */
import { Heading, Link, Text } from "@react-email/components";
import { Button } from "../components/button";
import { EmailLayout } from "../components/email-layout";
import { colors, textStyles } from "../styles";

const warningBox = {
  backgroundColor: colors.warningBg,
  border: `1px solid ${colors.warningBorder}`,
  borderRadius: "8px",
  padding: "16px",
  marginTop: "24px",
};

const warningText = {
  color: colors.warningText,
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

export type PasswordResetTemplateProps = {
  resetUrl: string;
  logoUrl?: string;
};

export function PasswordResetTemplate({ resetUrl, logoUrl }: PasswordResetTemplateProps) {
  return (
    <EmailLayout preview="Reset your STL Shelf password" logoUrl={logoUrl}>
      <Heading style={textStyles.heading}>Reset your password</Heading>

      <Text style={textStyles.paragraph}>
        You requested a password reset for your STL Shelf account. Click the button below to set a
        new password:
      </Text>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <Button href={resetUrl}>Reset Password</Button>
      </div>

      <Text style={textStyles.muted}>
        Or copy and paste this link into your browser:
        <br />
        <Link href={resetUrl} style={textStyles.linkMuted}>
          {resetUrl}
        </Link>
      </Text>

      <div style={warningBox}>
        <Text style={warningText}>
          This link will expire in 1 hour. If you didn't request a password reset, you can safely
          ignore this email — your password will remain unchanged.
        </Text>
      </div>
    </EmailLayout>
  );
}

export default PasswordResetTemplate;

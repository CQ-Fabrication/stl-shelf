/** @jsxImportSource react */
import { Heading, Link, Text } from "@react-email/components";
import { Button } from "../components/button";
import { EmailLayout } from "../components/email-layout";

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

export type MagicLinkTemplateProps = {
  magicLinkUrl: string;
  logoUrl?: string;
};

export function MagicLinkTemplate({ magicLinkUrl, logoUrl }: MagicLinkTemplateProps) {
  return (
    <EmailLayout preview="Sign in to STL Shelf with your magic link" logoUrl={logoUrl}>
      <Heading style={heading}>Sign in to STL Shelf</Heading>

      <Text style={paragraph}>
        Click the button below to sign in to your STL Shelf account. This link will expire in 15
        minutes.
      </Text>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <Button href={magicLinkUrl}>Sign in to STL Shelf</Button>
      </div>

      <Text style={mutedText}>
        Or copy and paste this link into your browser:
        <br />
        <Link href={magicLinkUrl} style={linkStyle}>
          {magicLinkUrl}
        </Link>
      </Text>

      <Text style={{ ...mutedText, marginTop: "32px" }}>
        If you didn't request this email, you can safely ignore it.
      </Text>
    </EmailLayout>
  );
}

export default MagicLinkTemplate;

/** @jsxImportSource react */
import { Heading, Link, Text } from "@react-email/components";
import { Button } from "../components/button";
import { EmailLayout } from "../components/email-layout";
import { textStyles } from "../styles";

export type MagicLinkTemplateProps = {
  magicLinkUrl: string;
  logoUrl?: string;
};

export function MagicLinkTemplate({ magicLinkUrl, logoUrl }: MagicLinkTemplateProps) {
  return (
    <EmailLayout preview="Sign in to STL Shelf with your magic link" logoUrl={logoUrl}>
      <Heading style={textStyles.heading}>Sign in to STL Shelf</Heading>

      <Text style={textStyles.paragraph}>
        Click the button below to sign in to your STL Shelf account. This link will expire in 15
        minutes.
      </Text>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <Button href={magicLinkUrl}>Sign in to STL Shelf</Button>
      </div>

      <Text style={textStyles.muted}>
        Or copy and paste this link into your browser:
        <br />
        <Link href={magicLinkUrl} style={textStyles.linkMuted}>
          {magicLinkUrl}
        </Link>
      </Text>

      <Text style={{ ...textStyles.muted, marginTop: "32px" }}>
        If you didn't request this email, you can safely ignore it.
      </Text>
    </EmailLayout>
  );
}

export default MagicLinkTemplate;

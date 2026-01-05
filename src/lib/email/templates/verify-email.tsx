/** @jsxImportSource react */
import { Heading, Link, Text } from "@react-email/components";
import { Button } from "../components/button";
import { EmailLayout } from "../components/email-layout";
import { textStyles } from "../styles";

export type VerifyEmailTemplateProps = {
  verificationUrl: string;
  logoUrl?: string;
};

export function VerifyEmailTemplate({ verificationUrl, logoUrl }: VerifyEmailTemplateProps) {
  return (
    <EmailLayout preview="Verify your email address to complete your STL Shelf registration" logoUrl={logoUrl}>
      <Heading style={textStyles.heading}>Verify your email address</Heading>

      <Text style={textStyles.paragraph}>
        Thanks for signing up for STL Shelf! To complete your registration and start organizing your
        3D model library, please verify your email address.
      </Text>

      <Text style={textStyles.paragraph}>Click the button below to verify your email:</Text>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <Button href={verificationUrl}>Verify Email Address</Button>
      </div>

      <Text style={textStyles.muted}>
        Or copy and paste this link into your browser:
        <br />
        <Link href={verificationUrl} style={textStyles.linkMuted}>
          {verificationUrl}
        </Link>
      </Text>

      <Text style={{ ...textStyles.muted, marginTop: "32px" }}>
        If you didn't create an account on STL Shelf, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}

export default VerifyEmailTemplate;

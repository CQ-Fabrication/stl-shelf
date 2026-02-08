/** @jsxImportSource react */
import { Heading, Link, Text } from "@react-email/components";
import { Button } from "../components/button";
import { EmailLayout } from "../components/email-layout";
import { textStyles } from "../styles";

export type OrganizationInvitationTemplateProps = {
  invitationUrl: string;
  organizationName: string;
  inviterName: string;
  logoUrl?: string;
};

export function OrganizationInvitationTemplate({
  invitationUrl,
  organizationName,
  inviterName,
  logoUrl,
}: OrganizationInvitationTemplateProps) {
  return (
    <EmailLayout preview={`Join ${organizationName} on STL Shelf`} logoUrl={logoUrl}>
      <Heading style={textStyles.heading}>You're invited to STL Shelf</Heading>

      <Text style={textStyles.paragraph}>
        <strong>{inviterName}</strong> invited you to join <strong>{organizationName}</strong>.
      </Text>

      <Text style={textStyles.paragraph}>
        Use the button below to accept the invitation. You can sign in or create an account first,
        then the invitation will be applied automatically.
      </Text>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <Button href={invitationUrl}>Accept invitation</Button>
      </div>

      <Text style={textStyles.muted}>
        Or copy and paste this link into your browser:
        <br />
        <Link href={invitationUrl} style={textStyles.linkMuted}>
          {invitationUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

export default OrganizationInvitationTemplate;

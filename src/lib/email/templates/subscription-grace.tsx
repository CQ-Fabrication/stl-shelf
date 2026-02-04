/** @jsxImportSource react */
import { Text } from "@react-email/components";
import { Button, EmailLayout, textStyles } from "@/lib/email";

export type SubscriptionGraceTemplateProps = {
  planName: string;
  graceDeadline: string;
  retentionDeadline: string;
  manageUrl: string;
  logoUrl?: string;
};

export default function SubscriptionGraceTemplate({
  planName,
  graceDeadline,
  retentionDeadline,
  manageUrl,
  logoUrl,
}: SubscriptionGraceTemplateProps) {
  return (
    <EmailLayout preview={`Your ${planName} plan ended — action required`} logoUrl={logoUrl}>
      <Text style={textStyles.heading}>Your plan ended</Text>
      <Text style={textStyles.paragraph}>
        Your {planName} subscription has ended and your account is now on the Free plan.
      </Text>
      <Text style={textStyles.paragraph}>
        Your usage is above the free limits, so your account is in read-only mode until{" "}
        {graceDeadline}. If you do not upgrade, older files will be removed after that date and no
        later than {retentionDeadline}.
      </Text>
      <Button href={manageUrl}>Upgrade Now</Button>
      <Text style={textStyles.muted}>Need help? Reply to this email and we will help.</Text>
    </EmailLayout>
  );
}

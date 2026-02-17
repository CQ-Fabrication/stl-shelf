/** @jsxImportSource react */
import { Heading, Text } from "@react-email/components";
import { Button } from "../components/button";
import { EmailLayout } from "../components/email-layout";
import { textStyles } from "../styles";

export type BandwidthUsageAlertTemplateProps = {
  orgName: string;
  percentLabel: number;
  usedLabel: string;
  limitLabel: string;
  manageUrl: string;
  isHardLimit: boolean;
  logoUrl?: string;
};

export default function BandwidthUsageAlertTemplate({
  orgName,
  percentLabel,
  usedLabel,
  limitLabel,
  manageUrl,
  isHardLimit,
  logoUrl,
}: BandwidthUsageAlertTemplateProps) {
  const preview = isHardLimit
    ? `Bandwidth limit reached for ${orgName}`
    : `Bandwidth usage update for ${orgName}`;

  return (
    <EmailLayout preview={preview} logoUrl={logoUrl}>
      <Heading style={textStyles.heading}>
        {isHardLimit ? "Bandwidth limit reached" : "Bandwidth usage update"}
      </Heading>
      <Text style={textStyles.paragraph}>
        Your organization <strong>{orgName}</strong> has used <strong>{percentLabel}%</strong> of
        its monthly download bandwidth.
      </Text>
      <Text style={textStyles.paragraph}>
        <strong>{usedLabel}</strong> of <strong>{limitLabel}</strong> used.
      </Text>
      <Text style={textStyles.paragraph}>
        {isHardLimit
          ? "Downloads may be interrupted until usage resets or your plan is upgraded."
          : "This is an early heads-up. No immediate action is required, but you can review usage and plans any time."}
      </Text>
      <div style={{ margin: "32px 0", textAlign: "center" }}>
        <Button href={manageUrl}>View Usage and Plans</Button>
      </div>
      <Text style={textStyles.muted}>Need help? Reply to this email and we will help.</Text>
    </EmailLayout>
  );
}

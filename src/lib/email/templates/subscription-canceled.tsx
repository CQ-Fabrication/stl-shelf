/** @jsxImportSource react */
import { Text } from "@react-email/components";
import { Button, EmailLayout, textStyles } from "@/lib/email";

export type SubscriptionCanceledTemplateProps = {
  planName: string;
  periodEnd: string | null;
  modelsUsed: number;
  modelsLimit: number;
  storageUsed: string;
  storageLimit: string;
  overModelCount: number;
  storageOverage: string | null;
  needsAction: boolean;
  manageUrl: string;
  logoUrl?: string;
};

export default function SubscriptionCanceledTemplate({
  planName,
  periodEnd,
  modelsUsed,
  modelsLimit,
  storageUsed,
  storageLimit,
  overModelCount,
  storageOverage,
  needsAction,
  manageUrl,
  logoUrl,
}: SubscriptionCanceledTemplateProps) {
  const endText = periodEnd ? `on ${periodEnd}` : "at the end of your billing period";
  const endLabel = periodEnd ?? "the end of your billing period";

  return (
    <EmailLayout preview={`Your ${planName} plan was canceled`} logoUrl={logoUrl}>
      <Text style={textStyles.heading}>Your plan will end {endText}</Text>
      <Text style={textStyles.paragraph}>
        Your {planName} subscription is canceled. You will keep full access until {endLabel}.
      </Text>
      <Text style={textStyles.paragraph}>
        Current usage for the Free plan:
        <br />
        Models: {modelsUsed} / {modelsLimit}
        <br />
        Storage: {storageUsed} / {storageLimit}
      </Text>
      <Text style={textStyles.paragraph}>
        {needsAction
          ? "Action needed before your plan ends:"
          : "You're already within free limits."}
      </Text>
      {needsAction && overModelCount > 0 ? (
        <Text style={textStyles.paragraph}>
          Remove at least {overModelCount} model{overModelCount === 1 ? "" : "s"} to stay within the
          free plan.
        </Text>
      ) : null}
      {needsAction && storageOverage ? (
        <Text style={textStyles.paragraph}>
          Reduce storage by {storageOverage} to stay within the free plan.
        </Text>
      ) : null}
      {needsAction ? (
        <Text style={textStyles.paragraph}>
          If you do nothing, your account will become read-only for 7 days when the plan ends, then
          older files may be removed.
        </Text>
      ) : (
        <Text style={textStyles.paragraph}>No further action is required.</Text>
      )}
      <Button href={manageUrl}>Manage Subscription</Button>
      <Text style={textStyles.muted}>Questions? Reply to this email and we will help.</Text>
    </EmailLayout>
  );
}

/** @jsxImportSource react */
import { Text } from "@react-email/components";
import { Button, EmailLayout, textStyles } from "@/lib/email";

export type AccountDeletionRequestedTemplateProps = {
  deletionDate: string;
  manageUrl: string;
  logoUrl?: string;
};

export default function AccountDeletionRequestedTemplate({
  deletionDate,
  manageUrl,
  logoUrl,
}: AccountDeletionRequestedTemplateProps) {
  return (
    <EmailLayout preview="Account deletion scheduled" logoUrl={logoUrl}>
      <Text style={textStyles.heading}>Account deletion requested</Text>
      <Text style={textStyles.paragraph}>
        We received your request to delete your STL Shelf account. Your account is scheduled for
        deletion on {deletionDate}.
      </Text>
      <Text style={textStyles.paragraph}>
        Until then, your account is read-only. You can still download your data. If you own
        organizations, they will be deleted along with all models and files.
      </Text>
      <Text style={textStyles.paragraph}>
        If this was a mistake, you can cancel the deletion from your account settings before the
        deletion date.
      </Text>
      <Button href={manageUrl}>Review Account Settings</Button>
      <Text style={textStyles.muted}>Questions? Reply to this email and we will help.</Text>
    </EmailLayout>
  );
}

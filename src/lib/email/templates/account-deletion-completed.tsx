/** @jsxImportSource react */
import { Text } from "@react-email/components";
import { EmailLayout, textStyles } from "@/lib/email";

export type AccountDeletionCompletedTemplateProps = {
  deletionDate: string;
  logoUrl?: string;
};

export default function AccountDeletionCompletedTemplate({
  deletionDate,
  logoUrl,
}: AccountDeletionCompletedTemplateProps) {
  return (
    <EmailLayout preview="Account deleted" logoUrl={logoUrl}>
      <Text style={textStyles.heading}>Account deleted</Text>
      <Text style={textStyles.paragraph}>
        Your STL Shelf account and associated data were deleted on {deletionDate}.
      </Text>
      <Text style={textStyles.muted}>
        If this was a mistake, reply to this email and we will review your request.
      </Text>
    </EmailLayout>
  );
}

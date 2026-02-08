// Components
export { Button } from "./components/button";
export { EmailLayout } from "./components/email-layout";

// Styles
export { colors, textStyles, fontFamily } from "./styles";

// Templates
export type { MagicLinkTemplateProps } from "./templates/magic-link";
export {
  default as MagicLinkTemplate,
  MagicLinkTemplate as MagicLink,
} from "./templates/magic-link";

export type { PasswordResetTemplateProps } from "./templates/password-reset";
export {
  default as PasswordResetTemplate,
  PasswordResetTemplate as PasswordReset,
} from "./templates/password-reset";

export type { VerifyEmailTemplateProps } from "./templates/verify-email";
export {
  default as VerifyEmailTemplate,
  VerifyEmailTemplate as VerifyEmail,
} from "./templates/verify-email";

export type { SubscriptionCanceledTemplateProps } from "./templates/subscription-canceled";
export {
  default as SubscriptionCanceledTemplate,
  default as SubscriptionCanceled,
} from "./templates/subscription-canceled";

export type { SubscriptionGraceTemplateProps } from "./templates/subscription-grace";
export {
  default as SubscriptionGraceTemplate,
  default as SubscriptionGrace,
} from "./templates/subscription-grace";

export type { AccountDeletionRequestedTemplateProps } from "./templates/account-deletion-requested";
export {
  default as AccountDeletionRequestedTemplate,
  default as AccountDeletionRequested,
} from "./templates/account-deletion-requested";

export type { AccountDeletionCompletedTemplateProps } from "./templates/account-deletion-completed";
export {
  default as AccountDeletionCompletedTemplate,
  default as AccountDeletionCompleted,
} from "./templates/account-deletion-completed";

export type { OrganizationInvitationTemplateProps } from "./templates/organization-invitation";
export {
  default as OrganizationInvitationTemplate,
  default as OrganizationInvitation,
} from "./templates/organization-invitation";

export type { BandwidthUsageAlertTemplateProps } from "./templates/bandwidth-usage-alert";
export {
  default as BandwidthUsageAlertTemplate,
  default as BandwidthUsageAlert,
} from "./templates/bandwidth-usage-alert";

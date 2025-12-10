// Components
export { Button } from "./components/button";
export { EmailLayout } from "./components/email-layout";
export type { MagicLinkTemplateProps } from "./emails/magic-link";
export {
  default as MagicLinkTemplate,
  MagicLinkTemplate as MagicLink,
} from "./emails/magic-link";
export type { PasswordResetTemplateProps } from "./emails/password-reset";
export {
  default as PasswordResetTemplate,
  PasswordResetTemplate as PasswordReset,
} from "./emails/password-reset";
// Types
export type { VerifyEmailTemplateProps } from "./emails/verify-email";
// Email Templates
export {
  default as VerifyEmailTemplate,
  VerifyEmailTemplate as VerifyEmail,
} from "./emails/verify-email";

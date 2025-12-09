// Components
export { Button } from "./components/button";
export { EmailLayout } from "./components/email-layout";

// Email Templates
export {
  default as VerifyEmailTemplate,
  VerifyEmailTemplate as VerifyEmail,
} from "./emails/verify-email";
export {
  default as PasswordResetTemplate,
  PasswordResetTemplate as PasswordReset,
} from "./emails/password-reset";

// Sending utilities
export { getResend, sendEmail } from "./send";

// Types
export type { VerifyEmailTemplateProps } from "./emails/verify-email";
export type { PasswordResetTemplateProps } from "./emails/password-reset";

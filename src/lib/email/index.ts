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

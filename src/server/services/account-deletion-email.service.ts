import { render } from "@react-email/components";
import { Resend } from "resend";
import { AccountDeletionCompletedTemplate, AccountDeletionRequestedTemplate } from "@/lib/email";
import { env } from "@/lib/env";
import { captureServerException } from "@/lib/error-tracking.server";
import { getErrorDetails, logErrorEvent } from "@/lib/logging";

let resendClient: Resend | null = null;

const getResendClient = () => {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export const sendAccountDeletionRequestedEmail = async (input: {
  email: string;
  deletionDate: Date;
  manageUrl: string;
}) => {
  const html = await render(
    AccountDeletionRequestedTemplate({
      deletionDate: formatDate(input.deletionDate),
      manageUrl: input.manageUrl,
      logoUrl: env.EMAIL_LOGO_URL,
    }),
  );

  const { error } = await getResendClient().emails.send({
    from: env.EMAIL_FROM,
    to: input.email,
    subject: "Account deletion scheduled",
    html,
  });

  if (error) {
    captureServerException(error, { emailType: "account_deletion_requested" });
    logErrorEvent("error.email.account_deletion_requested_failed", {
      emailType: "account_deletion_requested",
      ...getErrorDetails(error),
    });
    throw new Error(error.message);
  }
};

export const sendAccountDeletionCompletedEmail = async (input: {
  email: string;
  deletionDate: Date;
}) => {
  const html = await render(
    AccountDeletionCompletedTemplate({
      deletionDate: formatDate(input.deletionDate),
      logoUrl: env.EMAIL_LOGO_URL,
    }),
  );

  const { error } = await getResendClient().emails.send({
    from: env.EMAIL_FROM,
    to: input.email,
    subject: "Account deleted",
    html,
  });

  if (error) {
    captureServerException(error, { emailType: "account_deletion_completed" });
    logErrorEvent("error.email.account_deletion_completed_failed", {
      emailType: "account_deletion_completed",
      ...getErrorDetails(error),
    });
    throw new Error(error.message);
  }
};

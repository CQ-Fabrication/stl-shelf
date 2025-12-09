import { render } from "@react-email/components";
import React from "react";
import { Resend } from "resend";

let resendClient: Resend | null = null;

/**
 * Get or create a Resend client instance.
 * Lazily initializes to avoid failures when env vars aren't available.
 */
export function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Render and send an email using a React Email template.
 *
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param template - React component to render as email body
 * @param props - Props to pass to the template component
 * @param from - Optional from address (defaults to EMAIL_FROM env var)
 */
export async function sendEmail<T extends Record<string, unknown>>(
  to: string,
  subject: string,
  template: React.FunctionComponent<T>,
  props: T,
  from?: string
): Promise<{ id: string }> {
  const resend = getResend();

  const fromAddress =
    from ?? process.env.EMAIL_FROM ?? "STL Shelf <noreply@mail.stl-shelf.com>";

  // Render the React component to HTML
  const html = await render(React.createElement(template, props));

  // Send the email
  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  if (!data) {
    throw new Error("No response data from Resend");
  }

  return { id: data.id };
}

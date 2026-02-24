export const CONSENT_REQUIRED_ERROR_MESSAGE =
  "Consent required: Please accept our updated terms to continue";

export const isConsentRequiredError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message === CONSENT_REQUIRED_ERROR_MESSAGE;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message?: unknown };
    return message === CONSENT_REQUIRED_ERROR_MESSAGE;
  }

  return false;
};

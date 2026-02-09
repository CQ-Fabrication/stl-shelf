import { Resend } from "resend";
import { env } from "@/lib/env";
import { logErrorEvent } from "@/lib/logging";
import { isResendAlreadyExistsError, runResendRateLimited } from "@/server/services/resend/retry";

type ResendContactInput = {
  email: string;
  name?: string | null;
};

type ResendConsentInput = ResendContactInput & {
  marketingAccepted: boolean;
};

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const baseSegmentId = env.RESEND_SEGMENT_USERS;
const marketingSegmentId = env.RESEND_SEGMENT_MARKETING_OPT_IN;

const splitName = (name?: string | null) => {
  if (!name) return {};
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return {};
  const [firstName, ...rest] = parts;
  const lastName = rest.join(" ") || undefined;
  return { firstName, lastName };
};

const ensureContact = async (
  input: ResendContactInput,
): Promise<{ ok: boolean; exists: boolean }> => {
  if (!resend) return { ok: false, exists: false };
  const { email, name } = input;
  const { firstName, lastName } = splitName(name);

  const { error: createError } = await runResendRateLimited(() =>
    resend.contacts.create({
      email,
      firstName,
      lastName,
    }),
  );

  if (!createError) {
    return { ok: true, exists: false as const };
  }

  if (isResendAlreadyExistsError(createError)) {
    return { ok: true, exists: true as const };
  }

  // Fallback lookup to handle transient create failures where contact was still persisted.
  const { data: existing, error: getError } = await runResendRateLimited(() =>
    resend.contacts.get({ email }),
  );

  if (!getError && existing?.id) {
    return { ok: true, exists: true as const };
  }

  logErrorEvent("resend.contact.ensure_failed", {
    email,
    createErrorMessage: createError.message,
    getErrorMessage: getError?.message,
  });
  if (env.NODE_ENV === "development") {
    console.warn("[Resend] Unable to ensure contact:", {
      email,
      createError: createError.message,
      getError: getError?.message,
    });
  }
  return { ok: false, exists: false as const };
};

const updateContactName = async ({ email, name }: ResendContactInput) => {
  if (!resend) return;
  const { firstName, lastName } = splitName(name);
  if (!firstName && !lastName) return;

  const { error } = await runResendRateLimited(() =>
    resend.contacts.update({
      email,
      firstName,
      lastName,
    }),
  );

  if (error) {
    logErrorEvent("resend.contact.update_failed", {
      email,
      errorMessage: error.message,
    });
  }
};

const addToSegment = async (email: string, segmentId?: string | null) => {
  if (!resend || !segmentId) return;
  const { error } = await runResendRateLimited(() =>
    resend.contacts.segments.add({ email, segmentId }),
  );
  if (error) {
    logErrorEvent("resend.segment.add_failed", {
      email,
      segmentId,
      errorMessage: error.message,
    });
  }
};

const removeFromSegment = async (email: string, segmentId?: string | null) => {
  if (!resend || !segmentId) return;
  const { error } = await runResendRateLimited(() =>
    resend.contacts.segments.remove({ email, segmentId }),
  );
  if (error) {
    logErrorEvent("resend.segment.remove_failed", {
      email,
      segmentId,
      errorMessage: error.message,
    });
  }
};

export const syncResendSegments = async ({
  email,
  name,
  marketingAccepted,
}: ResendConsentInput) => {
  if (!resend) {
    if (env.NODE_ENV === "development") {
      console.warn("[Resend] Missing RESEND_API_KEY; skipping segment sync.");
    }
    return;
  }

  try {
    const contactResult = await ensureContact({
      email,
      name,
    });
    if (!contactResult.ok) {
      if (env.NODE_ENV === "development") {
        console.warn("[Resend] Unable to resolve contact; skipping segment sync.", { email });
      }
      return;
    }

    // Contact creation is enough when segments are not configured.
    if (!baseSegmentId && !marketingSegmentId) {
      return;
    }

    if (contactResult.exists) {
      await updateContactName({ email, name });
    }

    if (baseSegmentId) {
      await addToSegment(email, baseSegmentId);
    } else if (env.NODE_ENV === "development") {
      console.warn("[Resend] RESEND_SEGMENT_USERS not set; contact created without base segment.");
    }

    if (marketingAccepted) {
      if (marketingSegmentId) {
        await addToSegment(email, marketingSegmentId);
      } else if (env.NODE_ENV === "development") {
        console.warn(
          "[Resend] RESEND_SEGMENT_MARKETING_OPT_IN not set; cannot add marketing segment.",
        );
      }
    } else if (marketingSegmentId) {
      await removeFromSegment(email, marketingSegmentId);
    }
  } catch (error) {
    logErrorEvent("resend.segment.sync_failed", {
      email,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    if (env.NODE_ENV === "development") {
      console.error("[Resend] Segment sync failed:", error);
    }
  }
};

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

const createContactWithSegments = async (
  input: ResendContactInput & { segmentIds: string[] },
): Promise<{ ok: boolean; exists: boolean }> => {
  if (!resend) return { ok: false, exists: false };
  const { email, segmentIds } = input;

  const payload: Record<string, unknown> = {
    email,
  };
  if (segmentIds.length > 0) {
    payload.segments = segmentIds.map((id) => ({ id }));
  }

  const { error } = await runResendRateLimited(() =>
    resend.post<{ id: string }>("/contacts", payload),
  );

  if (!error) {
    return { ok: true, exists: false as const };
  }

  if (isResendAlreadyExistsError(error)) {
    return { ok: true, exists: true as const };
  }

  logErrorEvent("resend.contact.create_failed", {
    email,
    errorMessage: error.message,
  });
  if (env.NODE_ENV === "development") {
    console.warn("[Resend] Contact create failed:", error.message);
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

  // Skip external calls when segments are not configured.
  // This avoids unnecessary Resend API traffic on signup.
  if (!baseSegmentId && !marketingSegmentId) {
    return;
  }

  try {
    const targetSegmentIds = [baseSegmentId, marketingAccepted ? marketingSegmentId : null].filter(
      (value): value is string => Boolean(value),
    );

    const contactResult = await createContactWithSegments({
      email,
      name,
      segmentIds: targetSegmentIds,
    });
    if (!contactResult.ok) {
      if (env.NODE_ENV === "development") {
        console.warn("[Resend] Unable to resolve contact; skipping segment sync.", { email });
      }
      return;
    }

    // If contact was created with segments, we're done.
    if (!contactResult.exists) {
      return;
    }

    // Existing contact: reconcile desired membership.
    await updateContactName({ email, name });

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

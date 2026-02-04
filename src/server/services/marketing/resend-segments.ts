import { Resend } from "resend";
import { env } from "@/lib/env";
import { logErrorEvent } from "@/lib/logging";

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

const ensureContactId = async ({ email, name }: ResendContactInput) => {
  if (!resend) return null;
  const { firstName, lastName } = splitName(name);

  const { data: existing, error: getError } = await resend.contacts.get({ email });
  if (existing?.id) {
    if (firstName || lastName) {
      const { error: updateError } = await resend.contacts.update({
        id: existing.id,
        firstName,
        lastName,
      });
      if (updateError) {
        logErrorEvent("resend.contact.update_failed", {
          email,
          contactId: existing.id,
          errorMessage: updateError.message,
        });
      }
    }
    return existing.id;
  }

  if (getError && env.NODE_ENV === "development") {
    console.warn("[Resend] Contact lookup failed, attempting create:", getError.message);
  }

  const { data: created, error: createError } = await resend.contacts.create({
    email,
    firstName,
    lastName,
  });

  if (created?.id) return created.id;

  if (createError) {
    logErrorEvent("resend.contact.create_failed", {
      email,
      errorMessage: createError.message,
    });
    if (env.NODE_ENV === "development") {
      console.warn("[Resend] Contact create failed:", createError.message);
    }
  }

  const { data: retry } = await resend.contacts.get({ email });
  return retry?.id ?? null;
};

const addToSegment = async (contactId: string, segmentId?: string | null) => {
  if (!resend || !segmentId) return;
  const { error } = await resend.contacts.segments.add({ contactId, segmentId });
  if (error) {
    logErrorEvent("resend.segment.add_failed", {
      contactId,
      segmentId,
      errorMessage: error.message,
    });
  }
};

const removeFromSegment = async (contactId: string, segmentId?: string | null) => {
  if (!resend || !segmentId) return;
  const { error } = await resend.contacts.segments.remove({ contactId, segmentId });
  if (error) {
    logErrorEvent("resend.segment.remove_failed", {
      contactId,
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
    const contactId = await ensureContactId({ email, name });
    if (!contactId) {
      if (env.NODE_ENV === "development") {
        console.warn("[Resend] Unable to resolve contactId; skipping segment sync.", { email });
      }
      return;
    }
    if (baseSegmentId) {
      await addToSegment(contactId, baseSegmentId);
    } else if (env.NODE_ENV === "development") {
      console.warn("[Resend] RESEND_SEGMENT_USERS not set; contact created without base segment.");
    }

    if (marketingAccepted) {
      if (marketingSegmentId) {
        await addToSegment(contactId, marketingSegmentId);
      } else if (env.NODE_ENV === "development") {
        console.warn(
          "[Resend] RESEND_SEGMENT_MARKETING_OPT_IN not set; cannot add marketing segment.",
        );
      }
    } else if (marketingSegmentId) {
      await removeFromSegment(contactId, marketingSegmentId);
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

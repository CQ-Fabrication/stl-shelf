import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { organization, user } from "@/lib/db/schema/auth";
import { formatStorage } from "@/lib/billing/utils";
import { env } from "@/lib/env";
import { logAuditEvent, logErrorEvent } from "@/lib/logging";

const SOFT_LIMIT_MULTIPLIER = 3;
const HARD_LIMIT_MULTIPLIER = 5;
const WARN_80 = 0.8;
const WARN_100 = 1.0;

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const getPeriodStart = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const isSamePeriod = (a: Date | null, b: Date) =>
  !!a && a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();

const sendEgressWarningEmail = async (params: {
  to: string;
  orgName: string;
  percent: number;
  usedBytes: number;
  limitBytes: number;
}) => {
  if (!resend) return;

  const { to, orgName, percent, usedBytes, limitBytes } = params;
  const percentLabel = Math.round(percent * 100);
  const subject =
    percent >= 1 ? "STL Shelf: Bandwidth limit reached" : "STL Shelf: Bandwidth usage warning";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
      <h2>Bandwidth usage alert</h2>
      <p>Your organization <strong>${orgName}</strong> has used <strong>${percentLabel}%</strong> of its monthly download bandwidth.</p>
      <p><strong>${formatStorage(usedBytes)}</strong> of <strong>${formatStorage(limitBytes)}</strong> used.</p>
      <p>To avoid download interruptions, consider upgrading your plan or adding extra storage/bandwidth.</p>
      <p><a href="${env.WEB_URL}/billing">View usage and plans →</a></p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    logErrorEvent("error.egress.warning_email_failed", { error });
  }
};

export const getEgressLimits = (storageBytes: number) => {
  const baseline = Math.max(storageBytes, 0);
  return {
    softLimit: baseline * SOFT_LIMIT_MULTIPLIER,
    hardLimit: baseline * HARD_LIMIT_MULTIPLIER,
  };
};

export const getEgressUsageSnapshot = async (organizationId: string) => {
  const org = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const now = new Date();
  const periodStart = getPeriodStart(now);
  const shouldReset = !isSamePeriod(org.egressPeriodStart ?? null, periodStart);

  if (shouldReset) {
    await db
      .update(organization)
      .set({
        egressBytesThisMonth: 0,
        egressDownloadsThisMonth: 0,
        egressPeriodStart: periodStart,
        egressWarning80SentAt: null,
        egressWarning100SentAt: null,
      })
      .where(eq(organization.id, organizationId));
  }

  return {
    bytes: shouldReset ? 0 : Number(org.egressBytesThisMonth ?? 0),
    downloads: shouldReset ? 0 : (org.egressDownloadsThisMonth ?? 0),
    periodStart: periodStart,
  };
};

export const checkAndTrackEgress = async (params: {
  organizationId: string;
  bytes: number;
  downloadType: "file" | "zip" | "profile";
  fileId?: string;
  versionId?: string;
  modelId?: string;
  ip?: string;
}) => {
  const now = new Date();
  const periodStart = getPeriodStart(now);

  const org = await db.query.organization.findFirst({
    where: eq(organization.id, params.organizationId),
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  const shouldReset = !isSamePeriod(org.egressPeriodStart ?? null, periodStart);
  const currentBytes = shouldReset ? 0 : Number(org.egressBytesThisMonth ?? 0);
  const currentDownloads = shouldReset ? 0 : (org.egressDownloadsThisMonth ?? 0);

  const storageBytes = Number(org.currentStorage ?? 0);
  const limits = getEgressLimits(storageBytes);
  const softLimit = limits.softLimit > 0 ? limits.softLimit : params.bytes * SOFT_LIMIT_MULTIPLIER;
  const hardLimit = limits.hardLimit > 0 ? limits.hardLimit : params.bytes * HARD_LIMIT_MULTIPLIER;

  const newBytes = currentBytes + params.bytes;
  const tier = (org.subscriptionTier ?? "free").toLowerCase();
  const enforceHardLimit = tier === "free" || tier === "basic";

  if (enforceHardLimit && newBytes > hardLimit) {
    return {
      allowed: false,
      reason: "egress_limit",
      usedBytes: currentBytes,
      softLimitBytes: softLimit,
      hardLimitBytes: hardLimit,
    };
  }

  const percent = softLimit > 0 ? newBytes / softLimit : 0;
  const shouldWarn80 = percent >= WARN_80 && !org.egressWarning80SentAt;
  const shouldWarn100 = percent >= WARN_100 && !org.egressWarning100SentAt;

  await db
    .update(organization)
    .set({
      egressBytesThisMonth: newBytes,
      egressDownloadsThisMonth: currentDownloads + 1,
      egressPeriodStart: shouldReset ? periodStart : org.egressPeriodStart,
      egressWarning80SentAt: shouldReset
        ? shouldWarn80
          ? now
          : null
        : shouldWarn80
          ? now
          : org.egressWarning80SentAt,
      egressWarning100SentAt: shouldReset
        ? shouldWarn100
          ? now
          : null
        : shouldWarn100
          ? now
          : org.egressWarning100SentAt,
    })
    .where(eq(organization.id, org.id));

  logAuditEvent("egress.download_tracked", {
    organizationId: org.id,
    bytes: params.bytes,
    newBytes,
    downloadType: params.downloadType,
    modelId: params.modelId,
    versionId: params.versionId,
    fileId: params.fileId,
    ip: params.ip,
  });

  if (shouldWarn80 || shouldWarn100) {
    const [owner] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, org.ownerId ?? ""));

    if (owner?.email) {
      await sendEgressWarningEmail({
        to: owner.email,
        orgName: org.name,
        percent: shouldWarn100 ? WARN_100 : WARN_80,
        usedBytes: newBytes,
        limitBytes: softLimit,
      });
    }
  }

  return {
    allowed: true,
    usedBytes: newBytes,
    softLimitBytes: softLimit,
    hardLimitBytes: hardLimit,
  };
};

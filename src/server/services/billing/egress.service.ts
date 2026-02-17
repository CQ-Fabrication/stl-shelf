import { eq } from "drizzle-orm";
import { render } from "@react-email/components";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { organization, user } from "@/lib/db/schema/auth";
import {
  EGRESS_HARD_WARNING_RATIO,
  EGRESS_SOFT_WARNING_RATIO,
  shouldTriggerHardEgressWarning,
  shouldTriggerSoftEgressWarning,
} from "@/lib/billing/egress";
import { formatStorage } from "@/lib/billing/utils";
import { BandwidthUsageAlertTemplate } from "@/lib/email";
import { env } from "@/lib/env";
import { captureServerException } from "@/lib/error-tracking.server";
import { getErrorDetails, logAuditEvent, logErrorEvent } from "@/lib/logging";

const SOFT_LIMIT_MULTIPLIER = 3;
const HARD_LIMIT_MULTIPLIER = 5;

let resendClient: Resend | null = null;

const getResendClient = () => {
  if (!env.RESEND_API_KEY) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }

  return resendClient;
};

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
  const resend = getResendClient();
  if (!resend) return;

  const { to, orgName, percent, usedBytes, limitBytes } = params;
  const percentLabel = Math.round(percent * 100);
  const subject =
    percent >= EGRESS_HARD_WARNING_RATIO
      ? "STL Shelf: Bandwidth limit reached"
      : "STL Shelf: Bandwidth usage update";
  const html = await render(
    BandwidthUsageAlertTemplate({
      orgName,
      percentLabel,
      usedLabel: formatStorage(usedBytes),
      limitLabel: formatStorage(limitBytes),
      manageUrl: `${env.WEB_URL}/billing`,
      isHardLimit: percent >= 1,
      logoUrl: env.EMAIL_LOGO_URL,
    }),
  );

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    captureServerException(error, { emailType: "egress_warning" });
    logErrorEvent("error.egress.warning_email_failed", {
      emailType: "egress_warning",
      ...getErrorDetails(error),
    });
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
  const shouldWarn80 =
    shouldTriggerSoftEgressWarning(percent, newBytes) && !org.egressWarning80SentAt;
  const shouldWarn100 = shouldTriggerHardEgressWarning(percent) && !org.egressWarning100SentAt;

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
        percent: shouldWarn100 ? EGRESS_HARD_WARNING_RATIO : EGRESS_SOFT_WARNING_RATIO,
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

const MEBIBYTE = 1024 * 1024;

export const EGRESS_SOFT_WARNING_PERCENT = 80;
export const EGRESS_HARD_WARNING_PERCENT = 100;

export const EGRESS_SOFT_WARNING_RATIO = EGRESS_SOFT_WARNING_PERCENT / 100;
export const EGRESS_HARD_WARNING_RATIO = EGRESS_HARD_WARNING_PERCENT / 100;

// Prevent early warning noise on very small libraries where percentages jump too fast.
export const EGRESS_SOFT_WARNING_MIN_BYTES = 250 * MEBIBYTE;

export const shouldTriggerSoftEgressWarning = (usageRatio: number, usedBytes: number) =>
  usageRatio >= EGRESS_SOFT_WARNING_RATIO && usedBytes >= EGRESS_SOFT_WARNING_MIN_BYTES;

export const shouldTriggerHardEgressWarning = (usageRatio: number) =>
  usageRatio >= EGRESS_HARD_WARNING_RATIO;

export const shouldShowEgressWarning = (usagePercentage: number, usedBytes: number) =>
  shouldTriggerHardEgressWarning(usagePercentage / 100) ||
  shouldTriggerSoftEgressWarning(usagePercentage / 100, usedBytes);

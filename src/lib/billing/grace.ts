export const GRACE_PERIOD_DAYS = 7;
export const RETENTION_PERIOD_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export const addDays = (date: Date, days: number) => {
  return new Date(date.getTime() + days * DAY_MS);
};

export const getGraceDeadline = (from: Date) => {
  return addDays(from, GRACE_PERIOD_DAYS);
};

export const getRetentionDeadline = (graceDeadline: Date) => {
  return addDays(graceDeadline, RETENTION_PERIOD_DAYS);
};

export const isWithinRetentionWindow = (graceDeadline: Date | null, now = new Date()) => {
  if (!graceDeadline) return false;
  return now.getTime() <= getRetentionDeadline(graceDeadline).getTime();
};

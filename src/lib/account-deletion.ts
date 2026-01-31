export const ACCOUNT_DELETION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export const addDays = (date: Date, days: number) => {
  return new Date(date.getTime() + days * DAY_MS);
};

export const getAccountDeletionDeadline = (from: Date) => {
  return addDays(from, ACCOUNT_DELETION_DAYS);
};

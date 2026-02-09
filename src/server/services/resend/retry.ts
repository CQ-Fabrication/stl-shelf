import type { ErrorResponse, Response as ResendResponse } from "resend";

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BASE_DELAY_MS = 500;
const MAX_BACKOFF_MS = 5000;
const DEFAULT_MIN_INTERVAL_MS = 550;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeHeaders = (headers: Record<string, string> | null): Record<string, string> => {
  if (!headers) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value;
  }
  return out;
};

const parseRetryAfterMs = (headers: Record<string, string>): number | null => {
  const retryAfter = headers["retry-after"];
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }

  const dateMs = Date.parse(retryAfter);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
};

const parseResetMs = (headers: Record<string, string>): number | null => {
  const raw = headers["x-ratelimit-reset"] ?? headers["ratelimit-reset"];
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;

  const now = Date.now();

  // Epoch seconds
  if (value > 1_000_000_000) {
    return Math.max(0, Math.ceil(value * 1000 - now));
  }

  // Delta seconds
  return Math.ceil(value * 1000);
};

const fallbackDelayMs = (attempt: number): number =>
  Math.min(MAX_BACKOFF_MS, DEFAULT_BASE_DELAY_MS * 2 ** attempt);

const retryDelayMs = (headers: Record<string, string> | null, attempt: number): number => {
  const normalized = normalizeHeaders(headers);
  return parseRetryAfterMs(normalized) ?? parseResetMs(normalized) ?? fallbackDelayMs(attempt);
};

export const isResendRateLimitError = (error: ErrorResponse | null | undefined): boolean =>
  error?.name === "rate_limit_exceeded";

export const isResendAlreadyExistsError = (error: ErrorResponse | null | undefined): boolean => {
  if (!error) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("already exists") ||
    message.includes("already exist") ||
    message.includes("duplicate")
  );
};

export const runResendWithRetry = async <T>(
  operation: () => Promise<ResendResponse<T>>,
  options?: {
    maxAttempts?: number;
  },
): Promise<ResendResponse<T>> => {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await operation();

    if (!isResendRateLimitError(result.error)) {
      return result;
    }

    if (attempt === maxAttempts - 1) {
      return result;
    }

    await sleep(retryDelayMs(result.headers, attempt));
  }

  // Unreachable, but keeps TypeScript happy with exhaustive returns.
  return operation();
};

let resendQueueTail: Promise<void> = Promise.resolve();
let resendNextAllowedAt = 0;

const runWithRateLimit = async <T>(
  operation: () => Promise<ResendResponse<T>>,
  minIntervalMs: number,
): Promise<ResendResponse<T>> => {
  const now = Date.now();
  const waitMs = Math.max(0, resendNextAllowedAt - now);
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  resendNextAllowedAt = Date.now() + minIntervalMs;
  return runResendWithRetry(operation);
};

export const runResendRateLimited = async <T>(
  operation: () => Promise<ResendResponse<T>>,
  options?: {
    minIntervalMs?: number;
  },
): Promise<ResendResponse<T>> => {
  const minIntervalMs = options?.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;

  const queued = resendQueueTail.then(
    () => runWithRateLimit(operation, minIntervalMs),
    () => runWithRateLimit(operation, minIntervalMs),
  );

  resendQueueTail = queued.then(
    () => undefined,
    () => undefined,
  );

  return queued;
};

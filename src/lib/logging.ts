import { Logtail } from "@logtail/node";
import { env } from "@/lib/env";

type LogContext = Record<string, unknown>;

type LogLevel = "info" | "warn" | "error";

type LogtailOptions = {
  endpoint?: string;
};

const expectedErrorIndicators = [
  "Authentication required",
  "No active organization",
  "Not a member of this organization",
  "Organization not found",
  "Expected FormData",
  "Name and at least one file are required",
  "Model ID, changelog, and at least one file are required",
  "Version ID is required",
  "File is required",
  "File too large",
  "Member limit reached",
  "Model limit reached",
  "Storage limit exceeded",
  "Model not found",
  "Model not found or access denied",
  "Model not found or already deleted",
  "Version not found or access denied",
  "File not found or access denied",
  "No files found for this model",
  "No files found for this version",
  "At least one file is required",
  "File type .",
  "Cannot add file",
  "Cannot remove this file",
  "No subscription found",
  "Only organization owner",
  "Invalid email address",
  "Request headers not available",
  "Missing S3 bucket",
  "Failed to upload file:",
  "Failed to generate upload URL:",
  "Failed to generate download URL:",
  "Failed to get file:",
  "Failed to get file stream:",
  "Failed to get file metadata:",
  "Failed to list files:",
  "Failed to delete file:",
];

const normalizeEndpoint = (ingestingHost?: string): string | undefined => {
  const trimmed = ingestingHost?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const baseContext = {
  service: "stl-shelf",
  environment: env.NODE_ENV,
};

const normalizedEndpoint = normalizeEndpoint(env.BETTERSTACK_INGESTING_HOST);
const logtailOptions: LogtailOptions | undefined = normalizedEndpoint
  ? { endpoint: normalizedEndpoint }
  : undefined;

const sourceToken = env.BETTERSTACK_SOURCE_TOKEN?.trim();

const logtail = sourceToken ? new Logtail(sourceToken, logtailOptions) : null;

const writeLog = (level: LogLevel, message: string, context?: LogContext) => {
  if (!logtail) return;
  const payload = context ? { ...baseContext, ...context } : baseContext;
  void logtail[level](message, payload);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
};

export const getErrorDetails = (error: unknown) => ({
  errorName: error instanceof Error ? error.name : "UnknownError",
  errorMessage: getErrorMessage(error),
});

export const shouldLogServerError = (error: unknown): boolean => {
  const message = getErrorMessage(error);
  return !expectedErrorIndicators.some((indicator) => message.includes(indicator));
};

export const logAuditEvent = (event: string, context?: LogContext) => {
  writeLog("info", event, { eventType: "audit", ...context });
};

export const logDebugEvent = (event: string, context?: LogContext) => {
  writeLog("info", event, { eventType: "debug", ...context });
};

export const logErrorEvent = (event: string, context?: LogContext) => {
  writeLog("error", event, { eventType: "error", ...context });
};

if (logtail) {
  const flushLogs = () => void logtail.flush();
  process.on("beforeExit", flushLogs);
  process.on("SIGTERM", flushLogs);
}

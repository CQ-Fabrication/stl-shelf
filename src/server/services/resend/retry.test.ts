import { describe, expect, it, vi } from "vitest";
import type { ErrorResponse } from "resend";
import { isResendAlreadyExistsError, isResendRateLimitError, runResendWithRetry } from "./retry";

const asError = (value: Partial<ErrorResponse>): ErrorResponse =>
  ({
    message: value.message ?? "error",
    statusCode: value.statusCode ?? 500,
    name: value.name ?? "application_error",
  }) as ErrorResponse;

describe("resend retry helpers", () => {
  it("recognizes rate limit errors by HTTP status even with non-standard code names", () => {
    const error = asError({
      name: "application_error",
      statusCode: 429,
      message: "Too many requests",
    });
    expect(isResendRateLimitError(error)).toBe(true);
  });

  it("retries when rate limit is returned and eventually succeeds", async () => {
    const operation = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: asError({
          name: "application_error",
          statusCode: 429,
          message: "too_many_requests",
        }),
        headers: { "retry-after": "0" },
      })
      .mockResolvedValueOnce({
        data: { id: "ok" },
        error: null,
        headers: null,
      });

    const result = await runResendWithRetry(operation);

    expect(operation).toHaveBeenCalledTimes(2);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: "ok" });
  });

  it("recognizes already-existing contacts via HTTP conflict status", () => {
    const error = asError({
      name: "validation_error",
      statusCode: 409,
      message: "Conflict",
    });
    expect(isResendAlreadyExistsError(error)).toBe(true);
  });
});

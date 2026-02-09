import type { ErrorResponse } from "resend";
import { describe, expect, it, vi } from "vitest";

type TestState = {
  env: {
    RESEND_API_KEY: string;
    RESEND_SEGMENT_USERS: string | undefined;
    RESEND_SEGMENT_MARKETING_OPT_IN: string | undefined;
    NODE_ENV: "test";
  };
  createMock: ReturnType<typeof vi.fn>;
  getMock: ReturnType<typeof vi.fn>;
  updateMock: ReturnType<typeof vi.fn>;
  addMock: ReturnType<typeof vi.fn>;
  removeMock: ReturnType<typeof vi.fn>;
  logErrorEventMock: ReturnType<typeof vi.fn>;
};

const asError = (value: Partial<ErrorResponse>): ErrorResponse =>
  ({
    message: value.message ?? "error",
    statusCode: value.statusCode ?? 500,
    name: value.name ?? "application_error",
  }) as ErrorResponse;

const okResponse = <T>(data: T) =>
  ({
    data,
    error: null,
    headers: null,
  }) as const;

const errorResponse = (error: Partial<ErrorResponse>) =>
  ({
    data: null,
    error: asError(error),
    headers: null,
  }) as const;

const loadSubject = async (overrides?: Partial<TestState["env"]>) => {
  vi.resetModules();

  const state: TestState = {
    env: {
      RESEND_API_KEY: "re_test_key",
      RESEND_SEGMENT_USERS: undefined,
      RESEND_SEGMENT_MARKETING_OPT_IN: undefined,
      NODE_ENV: "test",
      ...overrides,
    },
    createMock: vi.fn().mockResolvedValue(okResponse({ id: "contact_1", object: "contact" })),
    getMock: vi.fn().mockResolvedValue(okResponse({ id: "contact_1" })),
    updateMock: vi.fn().mockResolvedValue(okResponse({ id: "contact_1", object: "contact" })),
    addMock: vi.fn().mockResolvedValue(okResponse({ id: "segment_1" })),
    removeMock: vi.fn().mockResolvedValue(okResponse({ id: "segment_1", deleted: true })),
    logErrorEventMock: vi.fn(),
  };

  vi.doMock("@/lib/env", () => ({
    env: state.env,
  }));

  vi.doMock("@/lib/logging", () => ({
    logErrorEvent: state.logErrorEventMock,
  }));

  vi.doMock("@/server/services/resend/retry", async () => {
    const actual = await vi.importActual<typeof import("@/server/services/resend/retry")>(
      "@/server/services/resend/retry",
    );
    return {
      ...actual,
      runResendRateLimited: async <T>(operation: () => Promise<T>) => operation(),
    };
  });

  vi.doMock("resend", () => ({
    Resend: class Resend {
      contacts = {
        create: state.createMock,
        get: state.getMock,
        update: state.updateMock,
        segments: {
          add: state.addMock,
          remove: state.removeMock,
        },
      };
    },
  }));

  const module = await import("./resend-segments");

  return {
    syncResendSegments: module.syncResendSegments,
    state,
  };
};

describe("syncResendSegments", () => {
  it("creates contact even when segments are not configured", async () => {
    const { syncResendSegments, state } = await loadSubject();

    await syncResendSegments({
      email: "claudioquaglia1985+segments-none@gmail.com",
      name: "Claudio Quaglia",
      marketingAccepted: false,
    });

    expect(state.createMock).toHaveBeenCalledTimes(1);
    expect(state.createMock).toHaveBeenCalledWith({
      email: "claudioquaglia1985+segments-none@gmail.com",
      firstName: "Claudio",
      lastName: "Quaglia",
    });
    expect(state.addMock).not.toHaveBeenCalled();
    expect(state.removeMock).not.toHaveBeenCalled();
  });

  it("reconciles segments for existing contacts", async () => {
    const { syncResendSegments, state } = await loadSubject({
      RESEND_SEGMENT_USERS: "seg_users",
      RESEND_SEGMENT_MARKETING_OPT_IN: "seg_marketing",
    });

    state.createMock.mockResolvedValue(
      errorResponse({
        name: "validation_error",
        statusCode: 409,
        message: "Contact already exists",
      }),
    );

    await syncResendSegments({
      email: "claudioquaglia1985+existing@gmail.com",
      name: "Claudio Quaglia",
      marketingAccepted: false,
    });

    expect(state.updateMock).toHaveBeenCalledTimes(1);
    expect(state.updateMock).toHaveBeenCalledWith({
      email: "claudioquaglia1985+existing@gmail.com",
      firstName: "Claudio",
      lastName: "Quaglia",
    });
    expect(state.addMock).toHaveBeenCalledWith({
      email: "claudioquaglia1985+existing@gmail.com",
      segmentId: "seg_users",
    });
    expect(state.removeMock).toHaveBeenCalledWith({
      email: "claudioquaglia1985+existing@gmail.com",
      segmentId: "seg_marketing",
    });
  });

  it("falls back to contact lookup when create fails unexpectedly", async () => {
    const { syncResendSegments, state } = await loadSubject({
      RESEND_SEGMENT_USERS: "seg_users",
    });

    state.createMock.mockResolvedValue(
      errorResponse({
        name: "application_error",
        statusCode: 500,
        message: "Temporary API error",
      }),
    );
    state.getMock.mockResolvedValue(okResponse({ id: "contact_recovered" }));

    await syncResendSegments({
      email: "claudioquaglia1985+recovered@gmail.com",
      name: "Claudio Quaglia",
      marketingAccepted: true,
    });

    expect(state.getMock).toHaveBeenCalledWith({
      email: "claudioquaglia1985+recovered@gmail.com",
    });
    expect(state.addMock).toHaveBeenCalledWith({
      email: "claudioquaglia1985+recovered@gmail.com",
      segmentId: "seg_users",
    });
  });
});

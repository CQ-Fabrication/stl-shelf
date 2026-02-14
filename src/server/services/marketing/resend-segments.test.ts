import type { ErrorResponse } from "resend";
import { beforeEach, describe, expect, it, vi } from "vitest";

type TestEnv = {
  RESEND_API_KEY: string;
  RESEND_SEGMENT_USERS: string | undefined;
  RESEND_SEGMENT_MARKETING_OPT_IN: string | undefined;
  NODE_ENV: "test";
};

const state = {
  env: {
    RESEND_API_KEY: "re_test_key",
    RESEND_SEGMENT_USERS: undefined,
    RESEND_SEGMENT_MARKETING_OPT_IN: undefined,
    NODE_ENV: "test",
  } as TestEnv,
  createMock: vi.fn(),
  getMock: vi.fn(),
  updateMock: vi.fn(),
  addMock: vi.fn(),
  removeMock: vi.fn(),
  logErrorEventMock: vi.fn(),
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

vi.mock("@/lib/env", () => ({
  env: state.env,
}));

vi.mock("@/lib/logging", () => ({
  logErrorEvent: state.logErrorEventMock,
}));

vi.mock("@/server/services/resend/retry", () => ({
  runResendRateLimited: async <T>(operation: () => Promise<T>) => operation(),
  isResendAlreadyExistsError: (error: { statusCode?: number }) => error.statusCode === 409,
}));

vi.mock("resend", () => ({
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

import { syncResendSegments } from "./resend-segments";

const resetState = (envOverrides?: Partial<TestEnv>) => {
  state.env.RESEND_API_KEY = "re_test_key";
  state.env.RESEND_SEGMENT_USERS = undefined;
  state.env.RESEND_SEGMENT_MARKETING_OPT_IN = undefined;
  state.env.NODE_ENV = "test";
  if (envOverrides?.RESEND_API_KEY !== undefined) {
    state.env.RESEND_API_KEY = envOverrides.RESEND_API_KEY;
  }
  if (envOverrides?.RESEND_SEGMENT_USERS !== undefined) {
    state.env.RESEND_SEGMENT_USERS = envOverrides.RESEND_SEGMENT_USERS;
  }
  if (envOverrides?.RESEND_SEGMENT_MARKETING_OPT_IN !== undefined) {
    state.env.RESEND_SEGMENT_MARKETING_OPT_IN = envOverrides.RESEND_SEGMENT_MARKETING_OPT_IN;
  }
};

beforeEach(() => {
  resetState();
  state.createMock
    .mockReset()
    .mockResolvedValue(okResponse({ id: "contact_1", object: "contact" }));
  state.getMock.mockReset().mockResolvedValue(okResponse({ id: "contact_1" }));
  state.updateMock
    .mockReset()
    .mockResolvedValue(okResponse({ id: "contact_1", object: "contact" }));
  state.addMock.mockReset().mockResolvedValue(okResponse({ id: "segment_1" }));
  state.removeMock.mockReset().mockResolvedValue(okResponse({ id: "segment_1", deleted: true }));
  state.logErrorEventMock.mockReset();
});

describe("syncResendSegments", () => {
  it("creates contact even when segments are not configured", async () => {
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
    resetState({
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
    resetState({
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

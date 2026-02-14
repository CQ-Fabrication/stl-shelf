import { beforeEach, describe, expect, it, vi } from "vitest";

type LiveSessionRecord = {
  session: {
    id: string;
    activeOrganizationId: string | null;
  };
  user: {
    id: string;
  };
};

type TestState = {
  session: LiveSessionRecord | null;
  selectResults: unknown[][];
  selectCalls: Array<{ fields: unknown }>;
  updateCalls: Array<{ table: unknown; setValue: unknown; whereValue: unknown }>;
};

const state: TestState = {
  session: null,
  selectResults: [],
  selectCalls: [],
  updateCalls: [],
};

const createSelectQuery = (result: unknown[]) => {
  const query = {
    from: vi.fn(() => query),
    innerJoin: vi.fn(() => query),
    where: vi.fn(() => query),
    limit: vi.fn(async () => result),
  };
  return query;
};

const db = {
  select: vi.fn((fields: unknown) => {
    state.selectCalls.push({ fields });
    return createSelectQuery(state.selectResults.shift() ?? []);
  }),
  update: vi.fn((table: unknown) => {
    const updateState = { table, setValue: null as unknown, whereValue: null as unknown };
    state.updateCalls.push(updateState);
    const query = {
      set: vi.fn((setValue: unknown) => {
        updateState.setValue = setValue;
        return query;
      }),
      where: vi.fn(async (whereValue: unknown) => {
        updateState.whereValue = whereValue;
      }),
    };
    return query;
  }),
};

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  eq: vi.fn((left: unknown, right: unknown) => ({ type: "eq", left, right })),
  isNull: vi.fn((value: unknown) => ({ type: "isNull", value })),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => state.session),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/db/schema/auth", () => ({
  member: {
    id: "member.id",
    organizationId: "member.organizationId",
    userId: "member.userId",
  },
  organization: {
    id: "organization.id",
    accountDeletionCompletedAt: "organization.accountDeletionCompletedAt",
  },
  session: { id: "session.id" },
  user: {
    id: "user.id",
    accountDeletionCompletedAt: "user.accountDeletionCompletedAt",
  },
}));

import { getLiveSession } from "./live-session";

const resetState = (overrides?: Partial<TestState>) => {
  state.session = {
    session: {
      id: "session_1",
      activeOrganizationId: "org_1",
    },
    user: {
      id: "user_1",
    },
  };
  state.selectResults = [[{ completedAt: null }], [{ id: "member_1" }]];
  state.selectCalls = [];
  state.updateCalls = [];
  if (overrides?.session !== undefined) {
    state.session = overrides.session;
  }
  if (overrides?.selectResults) {
    state.selectResults = overrides.selectResults;
  }
};

describe("getLiveSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetState();
  });

  it("returns null when there is no authenticated session", async () => {
    resetState({ session: null });
    const result = await getLiveSession(new Headers());
    expect(result).toBeNull();
  });

  it("clears stale active organization when membership no longer exists", async () => {
    resetState({ selectResults: [[{ completedAt: null }], []] });

    const result = await getLiveSession(new Headers());

    expect(result).not.toBeNull();
    expect(result?.session.activeOrganizationId).toBeNull();
    expect(state.updateCalls).toHaveLength(1);
    expect(state.updateCalls[0]?.setValue).toEqual({ activeOrganizationId: null });
  });

  it("keeps active organization when live membership exists", async () => {
    resetState({ selectResults: [[{ completedAt: null }], [{ id: "member_1" }]] });

    const result = await getLiveSession(new Headers());

    expect(result).not.toBeNull();
    expect(result?.session.activeOrganizationId).toBe("org_1");
    expect(state.updateCalls).toHaveLength(0);
  });

  it("returns null when account deletion is completed", async () => {
    resetState({ selectResults: [[{ completedAt: new Date("2026-01-01T00:00:00.000Z") }]] });

    const result = await getLiveSession(new Headers());

    expect(result).toBeNull();
    expect(state.updateCalls).toHaveLength(0);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

type ModelRow = { ownerId: string; organizationId: string; deletedAt: Date | null };
type VersionRow = { id: string; model: ModelRow };
type FileRow = { id: string; version: VersionRow };

const state = vi.hoisted(() => ({
  version: undefined as VersionRow | undefined,
  file: undefined as FileRow | undefined,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      modelVersions: { findFirst: vi.fn(async () => state.version) },
      modelFiles: { findFirst: vi.fn(async () => state.file) },
    },
  },
}));

import { assertCanEditModelOfFile, assertCanEditModelOfVersion } from "./model-permission.service";

const ORG = "org_1";
const OWNER_ID = "user_owner";

function actor(memberRole: string, userId: string) {
  return { organizationId: ORG, userId, memberRole };
}

function versionRow(overrides?: Partial<ModelRow>): VersionRow {
  return {
    id: "v1",
    model: { ownerId: OWNER_ID, organizationId: ORG, deletedAt: null, ...overrides },
  };
}

function fileRow(overrides?: Partial<ModelRow>): FileRow {
  return { id: "f1", version: versionRow(overrides) };
}

beforeEach(() => {
  state.version = undefined;
  state.file = undefined;
});

describe("assertCanEditModelOfVersion", () => {
  it("throws when the version does not exist", async () => {
    await expect(assertCanEditModelOfVersion("v1", actor("admin", OWNER_ID))).rejects.toThrow(
      "Model not found",
    );
  });

  it("throws when the model belongs to another organization", async () => {
    state.version = versionRow({ organizationId: "org_other" });
    await expect(assertCanEditModelOfVersion("v1", actor("admin", OWNER_ID))).rejects.toThrow(
      "Model not found",
    );
  });

  it("throws when the model is soft-deleted", async () => {
    state.version = versionRow({ deletedAt: new Date("2026-01-01") });
    await expect(assertCanEditModelOfVersion("v1", actor("admin", OWNER_ID))).rejects.toThrow(
      "Model not found",
    );
  });

  it("throws when a member targets someone else's model", async () => {
    state.version = versionRow();
    await expect(assertCanEditModelOfVersion("v1", actor("member", "user_other"))).rejects.toThrow(
      "You don't have permission to edit this model",
    );
  });

  it("allows a member on their own model", async () => {
    state.version = versionRow();
    await expect(
      assertCanEditModelOfVersion("v1", actor("member", OWNER_ID)),
    ).resolves.toBeUndefined();
  });

  it("allows admins and owners on any model", async () => {
    state.version = versionRow();
    await expect(
      assertCanEditModelOfVersion("v1", actor("admin", "user_other")),
    ).resolves.toBeUndefined();
    await expect(
      assertCanEditModelOfVersion("v1", actor("owner", "user_other")),
    ).resolves.toBeUndefined();
  });
});

describe("assertCanEditModelOfFile", () => {
  it("throws when the file does not exist", async () => {
    await expect(assertCanEditModelOfFile("f1", actor("admin", OWNER_ID))).rejects.toThrow(
      "Model not found",
    );
  });

  it("throws when the model belongs to another organization", async () => {
    state.file = fileRow({ organizationId: "org_other" });
    await expect(assertCanEditModelOfFile("f1", actor("admin", OWNER_ID))).rejects.toThrow(
      "Model not found",
    );
  });

  it("throws when the model is soft-deleted", async () => {
    state.file = fileRow({ deletedAt: new Date("2026-01-01") });
    await expect(assertCanEditModelOfFile("f1", actor("admin", OWNER_ID))).rejects.toThrow(
      "Model not found",
    );
  });

  it("throws when a member targets someone else's model", async () => {
    state.file = fileRow();
    await expect(assertCanEditModelOfFile("f1", actor("member", "user_other"))).rejects.toThrow(
      "You don't have permission to edit this model",
    );
  });

  it("allows a member on their own model", async () => {
    state.file = fileRow();
    await expect(
      assertCanEditModelOfFile("f1", actor("member", OWNER_ID)),
    ).resolves.toBeUndefined();
  });

  it("allows admins and owners on any model", async () => {
    state.file = fileRow();
    await expect(
      assertCanEditModelOfFile("f1", actor("admin", "user_other")),
    ).resolves.toBeUndefined();
    await expect(
      assertCanEditModelOfFile("f1", actor("owner", "user_other")),
    ).resolves.toBeUndefined();
  });
});

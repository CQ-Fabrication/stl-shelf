import type { InferInsertModel } from "drizzle-orm";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { models, modelTags, tags } from "@/lib/db/schema/models";

type InsertModelTag = InferInsertModel<typeof modelTags>;

type DatabaseInstance = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TagInfo = {
  name: string;
  color: string | null;
  usageCount: number;
};

/**
 * Full tag row for the org tag manager. Unlike TagInfo this carries the id
 * (needed to target rename/merge/delete/color ops) and createdAt, and includes
 * orphan tags (usageCount 0) — getAllTagsForOrganization inner-joins model_tags
 * so it can't surface unused tags.
 */
export type ManagedTagInfo = {
  id: string;
  name: string;
  color: string | null;
  usageCount: number;
  createdAt: Date;
};

/**
 * Thrown by renameTag when another tag in the same org already owns the target
 * name. Carries the existing tag's id so the caller can offer a merge instead
 * of surfacing a raw unique-constraint violation. Never auto-merges.
 */
export class TagNameTakenError extends Error {
  readonly code = "TAG_NAME_TAKEN" as const;
  readonly existingTagId: string;

  constructor(existingTagId: string, name: string) {
    super(`A tag named "${name}" already exists`);
    this.name = "TagNameTakenError";
    this.existingTagId = existingTagId;
  }
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const normalizeTagName = (name: string): string => name.trim().toLowerCase();

type ModelTagInfo = {
  tagName: string;
  tagColor: string | null;
  tagId: string;
};

export class TagService {
  async getAllTags(): Promise<TagInfo[]> {
    return await db
      .select({
        name: tags.name,
        color: tags.color,
        usageCount: tags.usageCount,
      })
      .from(tags)
      .orderBy(desc(tags.usageCount), asc(tags.name));
  }

  /**
   * All tags for an org, including orphans, with ids + createdAt for the tag
   * manager. usageCount is the denormalized column (reliable post-#50).
   */
  async getOrgTags(organizationId: string): Promise<ManagedTagInfo[]> {
    return await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        usageCount: tags.usageCount,
        createdAt: tags.createdAt,
      })
      .from(tags)
      .where(eq(tags.organizationId, organizationId))
      .orderBy(desc(tags.usageCount), asc(tags.name));
  }

  async getAllTagsForOrganization(organizationId: string): Promise<TagInfo[]> {
    const rows = await db
      .select({
        name: tags.name,
        color: tags.color,
        usageCount: sql<number>`count(${modelTags.modelId})::int`.as("usageCount"),
      })
      .from(modelTags)
      .innerJoin(tags, eq(tags.id, modelTags.tagId))
      .innerJoin(models, eq(models.id, modelTags.modelId))
      .where(and(eq(models.organizationId, organizationId), isNull(models.deletedAt)))
      .groupBy(tags.name, tags.color)
      .orderBy(asc(tags.name));

    return rows;
  }

  async addTagsToModel(
    modelId: string,
    tagNames: string[],
    organizationId: string,
    tx?: DatabaseInstance,
  ): Promise<void> {
    if (tagNames.length === 0) {
      return;
    }

    const run = async (dbInstance: DatabaseInstance): Promise<void> => {
      const tagIds = await this.upsertTagIds(tagNames, organizationId, dbInstance);
      if (tagIds.length === 0) {
        return;
      }

      // Lock the affected tags before mutating links + recounting (see lockTags).
      await this.lockTags(tagIds, dbInstance);

      const modelTagValues: Omit<InsertModelTag, "id" | "createdAt">[] = tagIds.map((tagId) => ({
        modelId,
        tagId,
      }));
      await dbInstance.insert(modelTags).values(modelTagValues).onConflictDoNothing();
      await this.recountTags(tagIds, dbInstance);
    };

    // The lock is only meaningful inside a transaction; open one when the caller
    // didn't provide it (single-tag add from the router), reuse theirs otherwise.
    if (tx) {
      await run(tx);
    } else {
      await db.transaction(run);
    }
  }

  async updateModelTags(
    modelId: string,
    newTagNames: string[],
    organizationId: string,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      const previousLinks = await tx
        .select({ tagId: modelTags.tagId })
        .from(modelTags)
        .where(eq(modelTags.modelId, modelId));

      // Resolve the new tag names to ids up front so the full affected set is
      // known before any link mutation, letting us take the locks first.
      const newTagIds = await this.upsertTagIds(newTagNames, organizationId, tx);

      const affectedTagIds = [
        ...new Set([...previousLinks.map((link) => link.tagId), ...newTagIds]),
      ];

      // Lock the affected tags before mutating links + recounting (see lockTags).
      await this.lockTags(affectedTagIds, tx);

      await tx.delete(modelTags).where(eq(modelTags.modelId, modelId));

      if (newTagIds.length > 0) {
        await tx
          .insert(modelTags)
          .values(newTagIds.map((tagId) => ({ modelId, tagId })))
          .onConflictDoNothing();
      }

      await this.recountTags(affectedTagIds, tx);

      // Update model's updatedAt to reflect the modification
      await tx.update(models).set({ updatedAt: new Date() }).where(eq(models.id, modelId));
    });
  }

  async removeTagsFromModel(
    modelId: string,
    tagNames: string[],
    organizationId: string,
  ): Promise<void> {
    if (tagNames.length === 0) {
      return;
    }

    const tagData = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.organizationId, organizationId), inArray(tags.name, tagNames)));

    const tagIds = tagData.map((tag) => tag.id);

    if (tagIds.length > 0) {
      await db.transaction(async (tx) => {
        // Lock the affected tags before mutating links + recounting (see lockTags).
        await this.lockTags(tagIds, tx);

        await tx
          .delete(modelTags)
          .where(and(eq(modelTags.modelId, modelId), inArray(modelTags.tagId, tagIds)));

        await this.recountTags(tagIds, tx);
      });
    }
  }

  /** Recount usage for all tags linked to a model (e.g. after soft delete/restore). */
  async recountTagsForModel(modelId: string, tx?: DatabaseInstance): Promise<void> {
    const dbInstance = tx || db;

    const links = await dbInstance
      .select({ tagId: modelTags.tagId })
      .from(modelTags)
      .where(eq(modelTags.modelId, modelId));

    const tagIds = links.map((link) => link.tagId);

    // Lock the affected tags before recounting (see lockTags). The caller runs
    // the count-affecting mutation (models.deletedAt) inside the same tx.
    await this.lockTags(tagIds, dbInstance);
    await this.recountTags(tagIds, dbInstance);
  }

  /** Upsert tags by name (org-scoped) and return their ids. */
  private async upsertTagIds(
    tagNames: string[],
    organizationId: string,
    dbInstance: DatabaseInstance,
  ): Promise<string[]> {
    if (tagNames.length === 0) {
      return [];
    }

    await dbInstance
      .insert(tags)
      .values(tagNames.map((name) => ({ name, organizationId })))
      .onConflictDoNothing({ target: [tags.organizationId, tags.name] });

    const rows = await dbInstance
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.organizationId, organizationId), inArray(tags.name, tagNames)));

    return rows.map((row) => row.id);
  }

  /**
   * Lock the given tag rows FOR UPDATE before mutating model_tags and recounting.
   *
   * usageCount is recomputed from live links inside the same transaction that
   * mutates those links. Under READ COMMITTED a second concurrent edit touching
   * the same tag can't see the first's uncommitted link changes, so its recount
   * would store a stale count and reintroduce drift. Taking the row lock first
   * makes the second transaction block until the first commits; its later
   * recount then sees the committed truth and counts stay exact.
   *
   * ORDER BY id is mandatory: a single, consistent lock order across concurrent
   * multi-tag operations prevents deadlocks.
   */
  private async lockTags(tagIds: string[], dbInstance: DatabaseInstance): Promise<void> {
    if (tagIds.length === 0) {
      return;
    }

    await dbInstance
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.id, tagIds))
      .orderBy(asc(tags.id))
      .for("update");
  }

  /**
   * usageCount is denormalized; the source of truth is model_tags joined to
   * non-deleted models (same convention as getAllTagsForOrganization).
   */
  private async recountTags(tagIds: string[], dbInstance: DatabaseInstance): Promise<void> {
    if (tagIds.length === 0) {
      return;
    }

    await dbInstance
      .update(tags)
      .set({
        usageCount: sql`(
          select count(*)::int
          from ${modelTags}
          inner join ${models} on ${models.id} = ${modelTags.modelId}
          where ${modelTags.tagId} = ${tags.id} and ${models.deletedAt} is null
        )`,
      })
      .where(inArray(tags.id, tagIds));
  }

  async getModelTags(modelId: string): Promise<ModelTagInfo[]> {
    return await db
      .select({
        tagName: tags.name,
        tagColor: tags.color,
        tagId: tags.id,
      })
      .from(modelTags)
      .innerJoin(tags, eq(tags.id, modelTags.tagId))
      .where(eq(modelTags.modelId, modelId));
  }

  /**
   * Count models currently linked to a tag (live count: non-deleted models
   * only, same convention as recountTags). Used for pre-op impact counts.
   */
  async countModelsForTag(tagId: string, tx?: DatabaseInstance): Promise<number> {
    const dbInstance = tx || db;

    const [row] = await dbInstance
      .select({ count: sql<number>`count(*)::int` })
      .from(modelTags)
      .innerJoin(models, eq(models.id, modelTags.modelId))
      .where(and(eq(modelTags.tagId, tagId), isNull(models.deletedAt)));

    return row?.count ?? 0;
  }

  /**
   * Rename a tag within its org. Normalizes trim/lowercase. A no-op when the
   * name is unchanged. If another tag in the org already holds the target name,
   * throws TagNameTakenError (carrying that tag's id) so the caller can offer a
   * merge — this never auto-merges.
   *
   * Renaming doesn't touch links or usageCount, so there's no recount. The row
   * is still locked FOR UPDATE to serialize against a concurrent merge/delete
   * of the same tag.
   */
  async renameTag({
    tagId,
    newName,
    organizationId,
  }: {
    tagId: string;
    newName: string;
    organizationId: string;
  }): Promise<{ status: "renamed" | "unchanged" }> {
    const normalized = normalizeTagName(newName);
    if (!normalized) {
      throw new Error("Tag name is required");
    }

    return await db.transaction(async (tx) => {
      await this.lockTags([tagId], tx);

      const [current] = await tx
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)));

      if (!current) {
        throw new Error("Tag not found");
      }

      if (current.name === normalized) {
        return { status: "unchanged" };
      }

      const [existing] = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.organizationId, organizationId), eq(tags.name, normalized)));

      if (existing) {
        throw new TagNameTakenError(existing.id, normalized);
      }

      await tx
        .update(tags)
        .set({ name: normalized, updatedAt: new Date() })
        .where(eq(tags.id, tagId));

      return { status: "renamed" };
    });
  }

  /**
   * Merge the source tag into the target: re-point every source link onto the
   * target (respecting the unique (model_id, tag_id) index via ON CONFLICT DO
   * NOTHING), delete the source tag row (cascade drops its now-redundant links),
   * and recount the target. Both tags must belong to the org and be distinct.
   *
   * Returns counts for the confirmation toast: how many models were relinked to
   * the target vs. how many already carried both tags.
   */
  async mergeTags({
    sourceTagId,
    targetTagId,
    organizationId,
  }: {
    sourceTagId: string;
    targetTagId: string;
    organizationId: string;
  }): Promise<{ modelsRelinked: number; alreadyHadTarget: number }> {
    if (sourceTagId === targetTagId) {
      throw new Error("Cannot merge a tag into itself");
    }

    return await db.transaction(async (tx) => {
      // Lock both rows (lockTags sorts by id) before mutating links/recounting.
      await this.lockTags([sourceTagId, targetTagId], tx);

      const owned = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(
          and(
            eq(tags.organizationId, organizationId),
            inArray(tags.id, [sourceTagId, targetTagId]),
          ),
        );

      if (owned.length !== 2) {
        throw new Error("Tag not found");
      }

      // Compute relink vs. overlap counts up front (driver-independent, avoids
      // relying on affected-row counts across pg/pglite).
      const sourceLinks = await tx
        .select({ modelId: modelTags.modelId })
        .from(modelTags)
        .where(eq(modelTags.tagId, sourceTagId));
      const targetLinks = await tx
        .select({ modelId: modelTags.modelId })
        .from(modelTags)
        .where(eq(modelTags.tagId, targetTagId));

      const targetModelIds = new Set(targetLinks.map((link) => link.modelId));
      const alreadyHadTarget = sourceLinks.filter((link) =>
        targetModelIds.has(link.modelId),
      ).length;
      const modelsRelinked = sourceLinks.length - alreadyHadTarget;

      await tx.execute(sql`
        insert into ${modelTags} (model_id, tag_id)
        select ${modelTags.modelId}, ${targetTagId}
        from ${modelTags}
        where ${modelTags.tagId} = ${sourceTagId}
        on conflict do nothing
      `);

      // Deleting the source cascades to its model_tags rows (FK on delete cascade).
      await tx.delete(tags).where(eq(tags.id, sourceTagId));

      await this.recountTags([targetTagId], tx);

      return { modelsRelinked, alreadyHadTarget };
    });
  }

  /**
   * Delete a tag from its org. Captures the live affected-model count before
   * deleting so the caller can confirm ("removed from N models"). The row
   * delete cascades to model_tags; no recount is needed (the tag is gone and
   * other tags are untouched).
   */
  async deleteTag({
    tagId,
    organizationId,
  }: {
    tagId: string;
    organizationId: string;
  }): Promise<{ affectedModels: number }> {
    return await db.transaction(async (tx) => {
      await this.lockTags([tagId], tx);

      const [tag] = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)));

      if (!tag) {
        throw new Error("Tag not found");
      }

      const affectedModels = await this.countModelsForTag(tagId, tx);

      await tx.delete(tags).where(eq(tags.id, tagId));

      return { affectedModels };
    });
  }

  /**
   * Update a tag's color (org-scoped). Color must be a #rrggbb hex string. No
   * link mutation, so no lock/recount. Throws when the tag isn't in the org.
   */
  async updateTagColor({
    tagId,
    color,
    organizationId,
  }: {
    tagId: string;
    color: string;
    organizationId: string;
  }): Promise<void> {
    if (!HEX_COLOR_PATTERN.test(color)) {
      throw new Error("Invalid tag color");
    }

    await db.transaction(async (tx) => {
      const [tag] = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.id, tagId), eq(tags.organizationId, organizationId)));

      if (!tag) {
        throw new Error("Tag not found");
      }

      await tx.update(tags).set({ color, updatedAt: new Date() }).where(eq(tags.id, tagId));
    });
  }
}

export const tagService = new TagService();

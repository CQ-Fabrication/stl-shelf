import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { models, modelTags, tags } from "@/lib/db/schema/models";

type InsertTag = InferInsertModel<typeof tags>;
type SelectTag = InferSelectModel<typeof tags>;
type InsertModelTag = InferInsertModel<typeof modelTags>;

type DatabaseInstance = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

type CreateTagInput = Omit<InsertTag, "id" | "usageCount" | "createdAt" | "updatedAt">;

export type TagInfo = {
  name: string;
  color: string | null;
  usageCount: number;
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

  async createTag(data: CreateTagInput): Promise<SelectTag> {
    const [newTag] = await db.insert(tags).values(data).returning();

    if (!newTag) {
      throw new Error("Failed to create tag");
    }

    return newTag;
  }

  async deleteTag(id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }
}

export const tagService = new TagService();

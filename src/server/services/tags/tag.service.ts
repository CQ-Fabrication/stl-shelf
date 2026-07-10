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

    const dbInstance = tx || db;

    await dbInstance
      .insert(tags)
      .values(tagNames.map((name) => ({ name, organizationId })))
      .onConflictDoNothing({ target: [tags.organizationId, tags.name] });

    const tagData = await dbInstance
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.organizationId, organizationId), inArray(tags.name, tagNames)));

    const modelTagValues: Omit<InsertModelTag, "id" | "createdAt">[] = tagData.map((tag) => ({
      modelId,
      tagId: tag.id,
    }));

    if (modelTagValues.length > 0) {
      await dbInstance.insert(modelTags).values(modelTagValues).onConflictDoNothing();
      await this.recountTags(
        tagData.map((tag) => tag.id),
        dbInstance,
      );
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

      await tx.delete(modelTags).where(eq(modelTags.modelId, modelId));

      if (newTagNames.length > 0) {
        await this.addTagsToModel(modelId, newTagNames, organizationId, tx);
      }

      await this.recountTags(
        previousLinks.map((link) => link.tagId),
        tx,
      );

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

    await this.recountTags(
      links.map((link) => link.tagId),
      dbInstance,
    );
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

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
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
      .where(eq(models.organizationId, organizationId))
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
    const dbInstance = tx || db;

    for (const tagName of tagNames) {
      await dbInstance
        .insert(tags)
        .values({
          name: tagName,
          organizationId,
        })
        .onConflictDoUpdate({
          target: [tags.organizationId, tags.name],
          set: {
            usageCount: sql`${tags.usageCount} + 1`,
            updatedAt: new Date(),
          },
        });
    }

    const tagData = await dbInstance
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(and(eq(tags.organizationId, organizationId), inArray(tags.name, tagNames)));

    const modelTagValues: Omit<InsertModelTag, "id" | "createdAt">[] = tagData.map(
      (tag: { id: string; name: string }) => ({
        modelId,
        tagId: tag.id,
      }),
    );

    if (modelTagValues.length > 0) {
      await dbInstance.insert(modelTags).values(modelTagValues).onConflictDoNothing();
    }
  }

  async updateModelTags(
    modelId: string,
    newTagNames: string[],
    organizationId: string,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(modelTags).where(eq(modelTags.modelId, modelId));

      if (newTagNames.length > 0) {
        await this.addTagsToModel(modelId, newTagNames, organizationId, tx);
      }

      // Update model's updatedAt to reflect the modification
      await tx.update(models).set({ updatedAt: new Date() }).where(eq(models.id, modelId));
    });
  }

  async removeTagsFromModel(modelId: string, tagNames: string[]): Promise<void> {
    if (tagNames.length === 0) {
      return;
    }

    const tagData = await db.select({ id: tags.id }).from(tags).where(inArray(tags.name, tagNames));

    const tagIds = tagData.map((tag) => tag.id);

    if (tagIds.length > 0) {
      await db
        .delete(modelTags)
        .where(and(eq(modelTags.modelId, modelId), inArray(modelTags.tagId, tagIds)));

      await db
        .update(tags)
        .set({
          usageCount: sql`GREATEST(${tags.usageCount} - 1, 0)`,
        })
        .where(inArray(tags.id, tagIds));
    }
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

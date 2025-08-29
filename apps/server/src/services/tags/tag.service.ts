import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { modelTags, models, tags } from '../../db/schema/models';

// Type aliases from Drizzle schema
type InsertTag = InferInsertModel<typeof tags>;
type SelectTag = InferSelectModel<typeof tags>;
type InsertModelTag = InferInsertModel<typeof modelTags>;

// Type for database instance (can be db or transaction)
// biome-ignore lint/suspicious/noExplicitAny: Transaction typing is complex, using any for simplicity
type DatabaseInstance = typeof db | any;

// Clean input types that omit auto-generated fields
type CreateTagInput = Omit<
  InsertTag,
  'id' | 'usageCount' | 'createdAt' | 'updatedAt'
>;

// Return type for tag queries
type TagInfo = {
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

  async getAllTagsForOwner(ownerId: string): Promise<string[]> {
    // Return distinct tag names for models owned by the user
    const rows = await db
      .select({ name: tags.name })
      .from(modelTags)
      .innerJoin(tags, eq(tags.id, modelTags.tagId))
      .innerJoin(models, eq(models.id, modelTags.modelId))
      .where(and(eq(models.ownerId, ownerId)))
      .groupBy(tags.name)
      .orderBy(asc(tags.name));
    // dedupe by groupBy, but map as array of strings
    return rows.map((r) => r.name);
  }

  async addTagsToModel(
    modelId: string,
    tagNames: string[],
    tx?: DatabaseInstance
  ): Promise<void> {
    const dbInstance = tx || db;

    // Create tags that don't exist
    for (const tagName of tagNames) {
      await dbInstance
        .insert(tags)
        .values({ name: tagName })
        .onConflictDoUpdate({
          target: tags.name,
          set: { usageCount: sql`${tags.usageCount} + 1` },
        });
    }

    // Get tag IDs
    const tagData = await dbInstance
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(inArray(tags.name, tagNames));

    // Link tags to model
    const modelTagValues: Omit<InsertModelTag, 'id' | 'createdAt'>[] =
      tagData.map((tag: { id: string; name: string }) => ({
        modelId,
        tagId: tag.id,
      }));

    if (modelTagValues.length > 0) {
      await dbInstance
        .insert(modelTags)
        .values(modelTagValues)
        .onConflictDoNothing();
    }
  }

  async updateModelTags(modelId: string, newTagNames: string[]): Promise<void> {
    await db.transaction(async (tx) => {
      // Remove existing tags
      await tx.delete(modelTags).where(eq(modelTags.modelId, modelId));

      // Add new tags
      if (newTagNames.length > 0) {
        await this.addTagsToModel(modelId, newTagNames, tx);
      }
    });
  }

  async removeTagsFromModel(
    modelId: string,
    tagNames: string[]
  ): Promise<void> {
    if (tagNames.length === 0) {
      return;
    }

    // Get tag IDs
    const tagData = await db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.name, tagNames));

    const tagIds = tagData.map((tag) => tag.id);

    if (tagIds.length > 0) {
      // Remove model-tag associations
      await db
        .delete(modelTags)
        .where(
          sql`${modelTags.modelId} = ${modelId} AND ${modelTags.tagId} IN (${tagIds.join(',')})`
        );

      // Decrease usage count
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
      throw new Error('Failed to create tag');
    }

    return newTag;
  }

  async deleteTag(id: string): Promise<void> {
    // Delete tag and all associations (cascading handled by DB)
    await db.delete(tags).where(eq(tags.id, id));
  }
}

export const tagService = new TagService();

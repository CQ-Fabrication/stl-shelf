import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { models, modelVersions } from '@/db/schema/models';

// Type aliases from Drizzle schema
type InsertModelVersion = InferInsertModel<typeof modelVersions>;
type SelectModelVersion = InferSelectModel<typeof modelVersions>;

// Clean input type that omits auto-generated fields
type CreateModelVersionInput = Omit<
  InsertModelVersion,
  'id' | 'createdAt' | 'updatedAt'
>;

// Update input type for partial updates
type UpdateModelVersionInput = Partial<
  Pick<InsertModelVersion, 'name' | 'description' | 'printSettings'>
>;

export class ModelVersionService {
  async createModelVersion(
    data: CreateModelVersionInput
  ): Promise<SelectModelVersion> {
    const [newVersion] = await db
      .insert(modelVersions)
      .values(data)
      .returning();

    if (!newVersion) {
      throw new Error('Failed to create model version');
    }

    // Update model's current version and total versions count
    await db
      .update(models)
      .set({
        currentVersion: data.version,
        totalVersions: sql`${models.totalVersions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(models.id, data.modelId));

    return newVersion;
  }

  async updateModelVersion(
    modelId: string,
    version: string,
    metadata: UpdateModelVersionInput
  ): Promise<void> {
    await db
      .update(modelVersions)
      .set({
        ...metadata,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(modelVersions.modelId, modelId),
          eq(modelVersions.version, version)
        )
      );
  }

  async deleteModelVersion(modelId: string, version: string): Promise<void> {
    await db
      .delete(modelVersions)
      .where(
        and(
          eq(modelVersions.modelId, modelId),
          eq(modelVersions.version, version)
        )
      );

    // Update total versions count
    await db
      .update(models)
      .set({
        totalVersions: sql`${models.totalVersions} - 1`,
        updatedAt: new Date(),
      })
      .where(eq(models.id, modelId));
  }
}

export const modelVersionService = new ModelVersionService();

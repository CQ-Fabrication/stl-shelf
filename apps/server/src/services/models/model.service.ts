import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { models } from '../../db/schema/models';

// Type aliases from Drizzle schema
type InsertModel = InferInsertModel<typeof models>;
type SelectModel = InferSelectModel<typeof models>;

// Clean input type that omits auto-generated fields
type CreateModelInput = Omit<
  InsertModel,
  'id' | 'currentVersion' | 'totalVersions' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

// Update input type for partial updates
type UpdateModelInput = Partial<Pick<InsertModel, 'name' | 'description'>>;

export class ModelService {
  async createModel(data: CreateModelInput): Promise<SelectModel> {
    const [newModel] = await db.insert(models).values(data).returning();

    if (!newModel) {
      throw new Error('Failed to create model');
    }

    return newModel;
  }

  async getModel(id: string, includeDeleted = false): Promise<SelectModel | null> {
    const conditions = [eq(models.id, id)];
    if (!includeDeleted) {
      conditions.push(isNull(models.deletedAt));
    }

    const modelData = await db
      .select()
      .from(models)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(1);

    if (modelData.length === 0) {
      return null;
    }
    return modelData[0] || null;
  }

  async updateModel(id: string, data: UpdateModelInput): Promise<void> {
    await db
      .update(models)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(models.id, id));
  }

  async deleteModel(id: string): Promise<void> {
    // Soft delete - set deletedAt timestamp
    await db
      .update(models)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(models.id, id));
  }

  async hardDeleteModel(id: string): Promise<void> {
    // Hard delete - permanently remove model and all cascading data
    await db.delete(models).where(eq(models.id, id));
  }

  async restoreModel(id: string): Promise<void> {
    // Restore soft-deleted model
    await db
      .update(models)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(models.id, id));
  }
}

export const modelService = new ModelService();

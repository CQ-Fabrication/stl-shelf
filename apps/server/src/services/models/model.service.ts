import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { models } from '../../db/schema/models';

// Type aliases from Drizzle schema
type InsertModel = InferInsertModel<typeof models>;
type SelectModel = InferSelectModel<typeof models>;

// Clean input type that omits auto-generated fields
type CreateModelInput = Omit<
  InsertModel,
  'id' | 'currentVersion' | 'totalVersions' | 'createdAt' | 'updatedAt'
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

  async getModel(id: string): Promise<SelectModel | null> {
    const modelData = await db
      .select()
      .from(models)
      .where(eq(models.id, id))
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
    // Delete model and all cascading data (versions, files, tags)
    await db.delete(models).where(eq(models.id, id));
  }
}

export const modelService = new ModelService();

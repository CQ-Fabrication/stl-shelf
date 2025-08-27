import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db/client';
import { modelFiles } from '../../db/schema/models';

// Type aliases from Drizzle schema
type InsertModelFile = InferInsertModel<typeof modelFiles>;
type SelectModelFile = InferSelectModel<typeof modelFiles>;

// Clean input type that omits auto-generated fields
type CreateModelFileInput = Omit<
  InsertModelFile,
  'id' | 'createdAt' | 'updatedAt'
>;

export class ModelFileService {
  async addFileToVersion(data: CreateModelFileInput): Promise<SelectModelFile> {
    const [newFile] = await db
      .insert(modelFiles)
      .values({
        ...data,
        fileMetadata: data.fileMetadata || { processed: false },
      })
      .returning();

    if (!newFile) {
      throw new Error('Failed to create model file');
    }
    return newFile;
  }

  async getFilesByVersion(versionId: string): Promise<SelectModelFile[]> {
    return await db
      .select()
      .from(modelFiles)
      .where(eq(modelFiles.versionId, versionId));
  }

  async getFilesByVersions(versionIds: string[]): Promise<SelectModelFile[]> {
    if (versionIds.length === 0) {
      return [];
    }

    return await db
      .select()
      .from(modelFiles)
      .where(inArray(modelFiles.versionId, versionIds));
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(modelFiles).where(eq(modelFiles.id, id));
  }

  async updateFileMetadata(
    id: string,
    metadata: SelectModelFile['fileMetadata']
  ): Promise<void> {
    await db
      .update(modelFiles)
      .set({
        fileMetadata: metadata,
        updatedAt: new Date(),
      })
      .where(eq(modelFiles.id, id));
  }
}

export const modelFileService = new ModelFileService();

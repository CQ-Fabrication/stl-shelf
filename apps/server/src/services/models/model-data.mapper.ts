import type {
  modelFiles,
  models,
  modelVersions,
  tags,
} from '@/db/schema/models';
import type { Model, ModelVersion } from '@/types/model';

type RawModelRow = {
  model: typeof models.$inferSelect;
  version: typeof modelVersions.$inferSelect | null;
  file: typeof modelFiles.$inferSelect | null;
  tagName: string | null;
  tagId: string | null;
  tagColor: string | null;
};

type TagInfo = {
  name: string;
  id: string;
  color: string | null;
};

export class ModelDataMapper {
  transformToModels(rows: RawModelRow[]): Model[] {
    if (!rows.length) return [];

    const { modelsMap, versionsMap, filesMap, tagsMap } =
      this.denormalizeData(rows);

    return Array.from(modelsMap.values()).map((model) =>
      this.buildModel(model, versionsMap, filesMap, tagsMap)
    );
  }

  transformToModel(rows: RawModelRow[]): Model | null {
    if (!rows.length || !rows[0]?.model) return null;

    const { modelsMap, versionsMap, filesMap, tagsMap } =
      this.denormalizeData(rows);
    const model = Array.from(modelsMap.values())[0];

    if (!model) return null;

    return this.buildModel(model, versionsMap, filesMap, tagsMap);
  }

  private denormalizeData(rows: RawModelRow[]) {
    const modelsMap = new Map<string, typeof models.$inferSelect>();
    const versionsMap = new Map<
      string,
      Map<string, typeof modelVersions.$inferSelect>
    >();
    const filesMap = new Map<string, (typeof modelFiles.$inferSelect)[]>();
    const tagsMap = new Map<string, Set<TagInfo>>();

    for (const row of rows) {
      this.processModelRow(row, modelsMap);
      this.processVersionRow(row, versionsMap, filesMap);
      this.processTagRow(row, tagsMap);
    }

    return { modelsMap, versionsMap, filesMap, tagsMap };
  }

  private processModelRow(
    row: RawModelRow,
    modelsMap: Map<string, typeof models.$inferSelect>
  ): void {
    const modelId = row.model.id;
    if (!modelsMap.has(modelId)) {
      modelsMap.set(modelId, row.model);
    }
  }

  private processVersionRow(
    row: RawModelRow,
    versionsMap: Map<string, Map<string, typeof modelVersions.$inferSelect>>,
    filesMap: Map<string, (typeof modelFiles.$inferSelect)[]>
  ): void {
    if (!row.version) return;

    const modelId = row.model.id;
    const versionId = row.version.id;

    if (!versionsMap.has(modelId)) {
      versionsMap.set(modelId, new Map());
    }

    const modelVersionsMap = versionsMap.get(modelId)!;
    if (!modelVersionsMap.has(versionId)) {
      modelVersionsMap.set(versionId, row.version);
    }

    if (row.file) {
      if (!filesMap.has(versionId)) {
        filesMap.set(versionId, []);
      }

      const versionFiles = filesMap.get(versionId)!;
      if (!versionFiles.find((f) => f.id === row.file?.id)) {
        versionFiles.push(row.file);
      }
    }
  }

  private processTagRow(
    row: RawModelRow,
    tagsMap: Map<string, Set<TagInfo>>
  ): void {
    if (!(row.tagName && row.tagId)) return;

    const modelId = row.model.id;

    if (!tagsMap.has(modelId)) {
      tagsMap.set(modelId, new Set());
    }

    tagsMap.get(modelId)!.add({
      name: row.tagName,
      id: row.tagId,
      color: row.tagColor,
    });
  }

  private buildModel(
    model: typeof models.$inferSelect,
    versionsMap: Map<string, Map<string, typeof modelVersions.$inferSelect>>,
    filesMap: Map<string, (typeof modelFiles.$inferSelect)[]>,
    tagsMap: Map<string, Set<TagInfo>>
  ): Model {
    const modelVersionsMap = versionsMap.get(model.id);
    const modelTags = Array.from(tagsMap.get(model.id) || []);

    const versions = this.buildVersions(
      modelVersionsMap ? Array.from(modelVersionsMap.values()) : [],
      filesMap,
      modelTags.map((t) => t.name)
    );

    const latestVersion = this.findLatestVersion(
      versions,
      model.currentVersion
    );

    return {
      id: model.id,
      slug: model.slug,
      currentVersion: model.currentVersion,
      versions,
      totalVersions: model.totalVersions,
      latestMetadata: latestVersion?.metadata || {
        name: model.name,
        description: model.description || undefined,
        tags: modelTags.map((t) => t.name),
        createdAt: model.createdAt.toISOString(),
        updatedAt: model.updatedAt.toISOString(),
      },
      createdAt: model.createdAt.toISOString(),
      updatedAt: model.updatedAt.toISOString(),
    };
  }

  private buildVersions(
    versionRecords: (typeof modelVersions.$inferSelect)[],
    filesMap: Map<string, (typeof modelFiles.$inferSelect)[]>,
    tagNames: string[]
  ): ModelVersion[] {
    return versionRecords
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((version) =>
        this.buildVersion(version, filesMap.get(version.id) || [], tagNames)
      );
  }

  private buildVersion(
    version: typeof modelVersions.$inferSelect,
    files: (typeof modelFiles.$inferSelect)[],
    tagNames: string[]
  ): ModelVersion {
    return {
      version: version.version,
      files: files.map((f) => ({
        filename: f.filename,
        originalName: f.originalName,
        size: f.size,
        mimeType: f.mimeType,
        extension: f.extension,
        boundingBox: f.fileMetadata?.boundingBox,
        triangleCount: f.fileMetadata?.triangleCount,
      })),
      metadata: {
        name: version.name,
        description: version.description || undefined,
        tags: tagNames,
        createdAt: version.createdAt.toISOString(),
        updatedAt: version.updatedAt.toISOString(),
        printSettings: version.printSettings || undefined,
      },
      thumbnailPath: version.thumbnailPath || undefined,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private findLatestVersion(
    versions: ModelVersion[],
    currentVersion: string
  ): ModelVersion | undefined {
    return versions.find((v) => v.version === currentVersion) || versions[0];
  }

  extractPaginationData(
    rows: { totalCount?: number }[],
    page: number,
    limit: number
  ) {
    const total = Number(rows[0]?.totalCount || 0);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}

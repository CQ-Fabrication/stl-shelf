import { measureAsync, type PerformanceMonitor } from '@/lib/performance';
import type { Model, ModelListQuery, ModelVersion } from '@/types/model';
import { ModelRepository } from './model.repository';
import { ModelDataMapper } from './model-data.mapper';
import { ModelQueryBuilder } from './query-builder';

export class ModelQueryService {
  private readonly repository = new ModelRepository();
  private readonly mapper = new ModelDataMapper();
  private readonly queryBuilder = new ModelQueryBuilder();
  private monitor?: PerformanceMonitor;

  setMonitor(monitor: PerformanceMonitor): this {
    this.monitor = monitor;
    this.repository.setMonitor(monitor);
    return this;
  }

  async listModels(
    query: ModelListQuery,
    organizationId: string
  ): Promise<{
    models: Model[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, limit, search, tags: tagFilter, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    // Build query using builder pattern
    this.monitor?.markStart('query_build');
    const { where, orderBy } = this.queryBuilder
      .reset()
      .withOrganization(organizationId)
      .withSearch(search)
      .withTags(tagFilter)
      .withSorting(sortBy, sortOrder)
      .build();
    this.monitor?.markEnd('query_build');

    // Fetch data from repository
    const rows = await this.repository.findModelsWithJoins(
      where,
      orderBy,
      limit,
      offset
    );

    if (rows.length === 0) {
      return {
        models: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Transform data using mapper
    const models = await measureAsync(
      'data_transformation',
      async () => this.mapper.transformToModels(rows.slice(0, limit * 10)),
      this.monitor
    );
    const pagination = this.mapper.extractPaginationData(rows, page, limit);

    return {
      models: models.slice(0, limit),
      pagination,
    };
  }

  async getModelWithAllData(
    id: string,
    organizationId: string
  ): Promise<Model | null> {
    const rows = await this.repository.findModelById(id, organizationId);
    return measureAsync(
      'model_transformation',
      async () => this.mapper.transformToModel(rows),
      this.monitor
    );
  }

  async getModelVersionsPaginated(
    modelId: string,
    _organizationId: string,
    offset = 0,
    limit = 5
  ): Promise<{
    versions: ModelVersion[];
    hasMore: boolean;
    total: number;
  }> {
    const rows = await this.repository.findVersionsPaginated(
      modelId,
      limit,
      offset
    );

    if (rows.length === 0) {
      return {
        versions: [],
        hasMore: false,
        total: 0,
      };
    }

    // Create a fake model object for the mapper
    const modelRows = rows.map((row) => ({
      ...row,
      model: {
        id: modelId,
        slug: '',
        name: '',
        description: null,
        currentVersion: '',
        totalVersions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId: _organizationId,
        ownerId: '',
      },
    }));

    const models = await measureAsync(
      'versions_transformation',
      async () => this.mapper.transformToModels(modelRows),
      this.monitor
    );
    const model = models[0];
    const total = Number(rows[0]?.totalCount || 0);

    return {
      versions: model?.versions || [],
      hasMore: offset + limit < total,
      total,
    };
  }
}

export const modelQueryService = new ModelQueryService();

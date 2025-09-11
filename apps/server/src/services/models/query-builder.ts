import { and, asc, desc, eq, inArray, type SQL, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import {
  modelFiles,
  models,
  modelTags,
  modelVersions,
  tags,
} from '@/db/schema/models';

export type QueryConditions = {
  organizationId: string;
  search?: string;
  tags?: string[];
};

export type QueryOptions = {
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'size';
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
};

export class ModelQueryBuilder {
  private conditions: SQL[] = [];
  private orderByClause: SQL | undefined;

  withOrganization(organizationId: string): this {
    this.conditions.push(eq(models.organizationId, organizationId));
    return this;
  }

  withSearch(search?: string): this {
    if (search) {
      this.conditions.push(
        sql`(${models.name} ILIKE ${`%${search}%`} OR ${models.description} ILIKE ${`%${search}%`})`
      );
    }
    return this;
  }

  withTags(tagFilter?: string[]): this {
    if (tagFilter?.length) {
      const taggedModels = sql`
        SELECT ${modelTags.modelId}
        FROM ${modelTags}
        INNER JOIN ${tags} ON ${tags.id} = ${modelTags.tagId}
        WHERE ${inArray(tags.name, tagFilter)}
        GROUP BY ${modelTags.modelId}
        HAVING COUNT(DISTINCT ${tags.name}) = ${tagFilter.length}
      `;

      this.conditions.push(sql`${models.id} IN (${taggedModels})`);
    }
    return this;
  }

  withSorting(
    sortBy: QueryOptions['sortBy'],
    sortOrder: QueryOptions['sortOrder']
  ): this {
    const sortColumns = this.getSortColumn(sortBy);
    const direction = sortOrder === 'asc' ? asc : desc;
    this.orderByClause = direction(sortColumns);
    return this;
  }

  private getSortColumn(sortBy: QueryOptions['sortBy']): PgColumn | SQL {
    const sortColumnMap = {
      name: models.name,
      createdAt: models.createdAt,
      updatedAt: models.updatedAt,
      size: sql`(
        SELECT SUM(${modelFiles.size})
        FROM ${modelFiles}
        INNER JOIN ${modelVersions} ON ${modelVersions.id} = ${modelFiles.versionId}
        WHERE ${modelVersions.modelId} = ${models.id}
      )`,
    } as const;

    return sortColumnMap[sortBy] || models.updatedAt;
  }

  build(): { where: SQL | undefined; orderBy: SQL | undefined } {
    return {
      where: this.conditions.length > 0 ? and(...this.conditions) : undefined,
      orderBy: this.orderByClause,
    };
  }

  reset(): this {
    this.conditions = [];
    this.orderByClause = undefined;
    return this;
  }
}

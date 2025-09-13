import { z } from 'zod';

// Base model metadata schema
export const ModelMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Print-specific metadata
  printSettings: z
    .object({
      material: z.string().optional(),
      layerHeight: z.number().optional(),
      infill: z.number().optional(),
      printTime: z.number().optional(), // in minutes
      weight: z.number().optional(), // in grams
    })
    .optional(),
});

// File information schema
export const ModelFileSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  size: z.number(), // in bytes
  mimeType: z.string(),
  extension: z.string(),
  // 3D-specific properties
  boundingBox: z
    .object({
      width: z.number(),
      height: z.number(),
      depth: z.number(),
    })
    .optional(),
  triangleCount: z.number().optional(),
  // Presigned download URL (added by server when returning model details)
  downloadUrl: z.string().optional(),
});

// Version schema
export const ModelVersionSchema = z.object({
  version: z.string(), // v1, v2, v3, etc.
  files: z.array(ModelFileSchema),
  metadata: ModelMetadataSchema,
  thumbnailPath: z.string().optional(),
  createdAt: z.string().datetime(),
});

// Complete model schema
export const ModelSchema = z.object({
  id: z.string(),
  slug: z.string(), // URL-friendly identifier
  currentVersion: z.string(),
  versions: z.array(ModelVersionSchema),
  totalVersions: z.number(),
  // Computed fields
  latestMetadata: ModelMetadataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Search and listing schemas
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const ModelListQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z
    .number()
    .int()
    .positive()
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z
    .enum(['name', 'createdAt', 'updatedAt', 'size'])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const ModelListResponseSchema = z.object({
  models: z.array(ModelSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Upload schemas
export const UploadModelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  printSettings: ModelMetadataSchema.shape.printSettings.optional(),
});

// Export types
export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;
export type ModelFile = z.infer<typeof ModelFileSchema>;
export type ModelVersion = z.infer<typeof ModelVersionSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type ModelListQuery = z.infer<typeof ModelListQuerySchema>;
export type ModelListResponse = z.infer<typeof ModelListResponseSchema>;
export type UploadModel = z.infer<typeof UploadModelSchema>;

// Utility types
export type FileSystemModel = {
  directory: string;
  versions: string[];
  indexPath: string;
  dataPath: string;
};

export type BoundingBox = {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  size: { width: number; height: number; depth: number };
};

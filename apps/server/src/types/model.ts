import { z } from "@/lib/zod";

// Base model metadata schema
export const modelMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// File information schema
export const modelFileSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  size: z.number(), // in bytes
  mimeType: z.string(),
  extension: z.string(),
  // Presigned download URL (added by server when returning model details)
  downloadUrl: z.string().optional(),
});

// Version schema
export const modelVersionSchema = z.object({
  version: z.string(), // v1, v2, v3, etc.
  files: z.array(modelFileSchema),
  metadata: modelMetadataSchema,
  thumbnailPath: z.string().optional(),
  createdAt: z.iso.datetime(),
});

// Complete model schema
export const modelSchema = z.object({
  id: z.string(),
  slug: z.string(), // URL-friendly identifier
  currentVersion: z.string(),
  versions: z.array(modelVersionSchema),
  totalVersions: z.number(),
  // Computed fields
  latestMetadata: modelMetadataSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Search and listing schemas
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export const modelListQuerySchema = z.object({
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
    .enum(["name", "createdAt", "updatedAt", "size"])
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const modelListResponseSchema = z.object({
  models: z.array(modelSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Upload schemas
export const uploadModelSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

// Export types
export type ModelMetadata = z.infer<typeof modelMetadataSchema>;
export type ModelFile = z.infer<typeof modelFileSchema>;
export type ModelVersion = z.infer<typeof modelVersionSchema>;
export type Model = z.infer<typeof modelSchema>;
export type ModelListQuery = z.infer<typeof modelListQuerySchema>;
export type ModelListResponse = z.infer<typeof modelListResponseSchema>;
export type UploadModel = z.infer<typeof uploadModelSchema>;

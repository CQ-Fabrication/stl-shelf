import { extname } from 'node:path';
import type { Context } from 'hono';
import { z, ZodError } from 'zod';
import {
  FileUploadSchema,
  safeJSONParse,
  TagsSchema,
  PrintSettingsSchema,
} from '@/lib/security/validators';
import { validateFileContent } from '@/lib/security/file-validator';
import {
  SecurityError,
  validateFilename,
  validateFileSize,
} from '@/lib/security';
import { modelService } from '@/services/models/model.service';
import { modelVersionService } from '@/services/models/model-version.service';
import { modelFileService } from '@/services/files/model-file.service';
import { tagService } from '@/services/tags/tag.service';
import { storageService } from '@/services/storage';
import { cacheService } from '@/services/cache';
import { gitService } from '@/services/git';

const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

export async function uploadHandler(c: Context) {
  try {
    // Get auth context - NO MORE MANUAL SESSION EXTRACTION!
    const authContext = c.get('auth');
    if (!authContext) {
      return c.json({ error: 'Unauthorized - No active organization' }, 401);
    }
    
    const { userId, organizationId } = authContext;
    
    const body = await c.req.parseBody();

    // Parse and validate input with Zod schemas
    const name = z.string().min(1).max(255).parse(body.name);
    const description = z.string().max(2000).optional().parse(body.description);
    const modelId = z.string().uuid().optional().parse(body.modelId as string | undefined);

    // Secure JSON parsing with validation
    const tags = body.tags
      ? safeJSONParse(body.tags as string, TagsSchema)
      : [];
    const printSettings = body.printSettings
      ? safeJSONParse(body.printSettings as string, PrintSettingsSchema)
      : undefined;

    // Validate complete input object
    const validatedInput = FileUploadSchema.parse({
      name,
      description,
      tags,
      printSettings,
      modelId,
    });

    // Get uploaded files
    const files: File[] = [];
    const formData = await c.req.formData();

    for (const [key, value] of formData.entries()) {
      if (
        key === 'files' &&
        typeof value === 'object' &&
        value !== null &&
        'name' in value
      ) {
        files.push(value as File);
      }
    }

    if (files.length === 0) {
      return c.json({ error: 'No files uploaded' }, HTTP_BAD_REQUEST);
    }

    // Comprehensive file validation
    for (const file of files) {
      // Path traversal protection
      validateFilename(file.name);
      // Size validation
      validateFileSize(file.size);
      // Content validation with magic bytes
      await validateFileContent(file);
    }

    let finalModelId: string;
    let version: string;
    let isNewVersion = false;

    if (validatedInput.modelId) {
      // Adding version to existing model - verify ownership
      const existingModel = await modelService.getModel(validatedInput.modelId);
      if (!existingModel) {
        return c.json({ error: 'Model not found' }, HTTP_NOT_FOUND);
      }
      if (existingModel.organizationId !== organizationId) {
        return c.json({ error: 'Forbidden' }, HTTP_FORBIDDEN);
      }

      finalModelId = validatedInput.modelId;
      const nextVersionNumber = existingModel.totalVersions + 1;
      version = `v${nextVersionNumber}`;
      isNewVersion = true;
    } else {
      // Create new model with organization context
      // Add short random suffix to slug to ensure uniqueness
      const baseSlug = validatedInput.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${baseSlug}-${randomSuffix}`;

      const model = await modelService.createModel({
        name: validatedInput.name,
        slug,
        description: validatedInput.description,
        organizationId,
        ownerId: userId,
      });

      // Add tags with organization context
      if (validatedInput.tags && validatedInput.tags.length > 0) {
        await tagService.addTagsToModel(model.id, validatedInput.tags, organizationId);
      }

      if (!model) {
        throw new Error('Failed to create model');
      }

      finalModelId = model.id;
      version = 'v1';
    }

    // Create version in database
    const dbVersion = await modelVersionService.createModelVersion({
      modelId: finalModelId,
      version,
      name: isNewVersion ? `${validatedInput.name} ${version}` : validatedInput.name,
      description: validatedInput.description,
      printSettings: validatedInput.printSettings,
    });

    if (!dbVersion) {
      throw new Error('Failed to create model version');
    }

    // Process and upload files with security validation
    const uploadedFiles: Array<{
      filename: string;
      originalName: string;
      size: number;
      mimeType: string;
    }> = [];

    for (const file of files) {
      const safeFilename = validateFilename(file.name);
      const ext = extname(safeFilename).toLowerCase();

      // Generate secure storage key
      const storageKey = storageService.generateStorageKey({
        modelId: finalModelId,
        version,
        filename: safeFilename,
      });

      // Upload to storage with validated content
      const uploadResult = await storageService.uploadFile({
        key: storageKey,
        file,
        contentType: file.type,
        metadata: {
          originalName: file.name,
          modelId: finalModelId,
          version,
          organizationId,
        },
      });

      // Add file record to database
      await modelFileService.addFileToVersion({
        versionId: dbVersion.id,
        filename: safeFilename,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        extension: ext,
        storageKey: uploadResult.key,
        storageUrl: uploadResult.url,
        storageBucket: storageService.defaultModelsBucket,
        fileMetadata: {
          processed: false,
        },
      });

      uploadedFiles.push({
        filename: safeFilename,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      });
    }

    // Invalidate cache for this organization
    await cacheService.invalidateModel(finalModelId, organizationId);

    // Audit log the upload
    // TODO: Implement audit logging

    // Git commit (non-blocking)
    try {
      const commitMessage = isNewVersion
        ? `Add new version ${version} for ${validatedInput.name}`
        : `Add ${validatedInput.name} ${version}`;
      await gitService.commitModelUpload(finalModelId, version, commitMessage);
    } catch (error) {
      console.error('Git commit failed:', error);
    }

    return c.json({
      success: true,
      modelId: finalModelId,
      version,
      files: uploadedFiles.length,
      isNewVersion,
    });
  } catch (error) {
    // Sanitized error responses
    if (error instanceof ZodError) {
      return c.json(
        {
          error: 'Validation failed',
          details: (error as any).errors?.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        HTTP_BAD_REQUEST
      );
    }

    console.error('Upload error:', error);
    
    // Include more error details in development
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return c.json(
      {
        error: 'Upload failed',
        code: 'UPLOAD_ERROR',
        ...(isDev && { 
          details: errorMessage,
          stack: error instanceof Error ? error.stack : undefined 
        }),
      },
      500
    );
  }
}
// import { env } from "cloudflare:workers";
import 'dotenv/config';
import { env } from './env';
import { extname, join } from 'node:path';
import { RPCHandler } from '@orpc/server/fetch';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createContext } from './lib/context';
import {
  SecurityError,
  validateFilename,
  validateFileSize,
} from './lib/security';
import { appRouter } from './routers/index';
import { cacheService } from './services/cache';
import { modelFileService } from './services/files/model-file.service';
import { gitService } from './services/git';
// Direct imports - NO BARREL EXPORTS
import { modelService } from './services/models/model.service';
import { modelVersionService } from './services/models/model-version.service';
// getServicesHealth function moved here since it's only used in this file
import { storageService } from './services/storage';
import { tagService } from './services/tags/tag.service';

const app = new Hono();

// HTTP Status constants
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

// Development mode check
const isDevelopment = process.env.NODE_ENV !== 'production';

console.log(
  `STL Shelf API starting in ${isDevelopment ? 'development' : 'production'} mode`
);

app.use(logger());
app.use(
  '/*',
  cors({
    // Improved CORS configuration - no more wildcard in production
    origin: (origin) => {
      const allowedOrigins = env.CORS_ORIGIN
        ? env.CORS_ORIGIN.split(',')
        : ['http://localhost:3001', 'http://127.0.0.1:3001'];

      // Allow no origin for non-browser requests (like Postman)
      if (!origin) {
        return '*';
      }

      return allowedOrigins.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86_400, // 24 hours
  })
);

// File upload endpoint - using new database architecture
app.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const name = body.name as string;
    const description = body.description as string;
    const tags = body.tags ? JSON.parse(body.tags as string) : [];
    const modelId = body.modelId as string | undefined; // For version uploads
    const printSettings = body.printSettings
      ? JSON.parse(body.printSettings as string)
      : undefined;

    if (!name) {
      return c.json({ error: 'Name is required' }, HTTP_BAD_REQUEST);
    }

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

    // Validate all files before processing
    for (const file of files) {
      validateFilename(file.name);
      validateFileSize(file.size);
    }

    let finalModelId: string;
    let version: string;
    let isNewVersion = false;

    if (modelId) {
      // Adding version to existing model
      const existingModel = await modelService.getModel(modelId);
      if (!existingModel) {
        return c.json({ error: 'Model not found' }, HTTP_NOT_FOUND);
      }

      finalModelId = modelId;
      // For now, just increment the total versions count to get next version
      const nextVersionNumber = existingModel.totalVersions + 1;
      version = `v${nextVersionNumber}`;
      isNewVersion = true;
    } else {
      // Create new model
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-');
      const model = await modelService.createModel({
        name,
        slug,
        description,
      });

      // Add tags if provided
      if (tags && tags.length > 0) {
        await tagService.addTagsToModel(model.id, tags);
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
      name: isNewVersion ? `${name} ${version}` : name,
      description,
      printSettings,
    });

    if (!dbVersion) {
      throw new Error('Failed to create model version');
    }

    // Process and upload files
    const uploadedFiles: Array<{
      filename: string;
      originalName: string;
      size: number;
      mimeType: string;
    }> = [];

    for (const file of files) {
      const safeFilename = validateFilename(file.name);
      const ext = extname(safeFilename).toLowerCase();

      // Generate storage key
      const storageKey = storageService.generateStorageKey({
        modelId: finalModelId,
        version,
        filename: safeFilename,
      });

      // Upload to storage
      const uploadResult = await storageService.uploadFile({
        key: storageKey,
        file,
        contentType: file.type,
        metadata: {
          originalName: file.name,
          modelId: finalModelId,
          version,
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
          processed: false, // Will be processed later for 3D analysis
        },
      });

      uploadedFiles.push({
        filename: safeFilename,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      });
    }

    // Invalidate cache
    await cacheService.invalidateModel(finalModelId);

    // Try to commit to git - but don't fail if Git has issues
    try {
      const commitMessage = isNewVersion
        ? `Add new version ${version} for ${name}`
        : `Add ${name} ${version}`;
      await gitService.commitModelUpload(finalModelId, version, commitMessage);
    } catch (error) {
      console.error(
        'Git commit failed for upload:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      // Continue without Git - files are still saved
    }

    return c.json({
      success: true,
      modelId: finalModelId,
      version,
      files: uploadedFiles.length,
      isNewVersion,
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Handle security errors appropriately
    if (error instanceof SecurityError) {
      return c.json(
        {
          error: 'Invalid upload data',
          code: error.code,
        },
        HTTP_BAD_REQUEST
      );
    }

    return c.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      HTTP_INTERNAL_SERVER_ERROR
    );
  }
});

// File serving endpoint - redirect to presigned URL
app.get('/files/:modelId/:version/:filename', async (c) => {
  try {
    const { modelId, version, filename } = c.req.param();

    // Validate filename for security
    const safeFilename = validateFilename(filename);

    // Generate storage key
    const storageKey = storageService.generateStorageKey({
      modelId,
      version,
      filename: safeFilename,
    });

    // Check if file exists in storage
    const exists = await storageService.fileExists(storageKey);
    if (!exists) {
      return c.json({ error: 'File not found' }, HTTP_NOT_FOUND);
    }

    // Check cache for presigned URL first
    const cachedUrl = await cacheService.getCachedPresignedUrl(storageKey);
    if (cachedUrl) {
      return c.redirect(cachedUrl.url);
    }

    // Generate new presigned URL
    const downloadUrl = await storageService.generateDownloadUrl(storageKey);

    // Cache the presigned URL
    await cacheService.cachePresignedUrl(storageKey, downloadUrl, 60); // 1 hour

    // Redirect to presigned URL
    return c.redirect(downloadUrl);
  } catch (error) {
    // Handle security errors with appropriate status codes
    if (error instanceof SecurityError) {
      return c.json(
        {
          error: 'Invalid request',
          code: error.code,
        },
        HTTP_BAD_REQUEST
      );
    }
    return c.json({ error: 'File not found' }, HTTP_NOT_FOUND);
  }
});

// Thumbnail serving endpoint - redirect to presigned URL
app.get('/thumbnails/:modelId/:version', async (c) => {
  try {
    const { modelId, version } = c.req.param();

    // Generate storage key for thumbnail
    const storageKey = storageService.generateStorageKey({
      modelId,
      version,
      filename: 'thumbnail.png',
      type: 'thumbnail',
    });

    // Check if thumbnail exists in storage
    const exists = await storageService.fileExists(
      storageKey,
      storageService.defaultThumbnailsBucket
    );
    if (!exists) {
      return c.json({ error: 'Thumbnail not found' }, HTTP_NOT_FOUND);
    }

    // Check cache for presigned URL first
    const cachedUrl = await cacheService.getCachedPresignedUrl(
      `thumbnail:${storageKey}`
    );
    if (cachedUrl) {
      return c.redirect(cachedUrl.url);
    }

    // Generate new presigned URL
    const downloadUrl = await storageService.generateDownloadUrl(
      storageKey,
      storageService.defaultThumbnailsBucket,
      60 // 1 hour
    );

    // Cache the presigned URL
    await cacheService.cachePresignedUrl(
      `thumbnail:${storageKey}`,
      downloadUrl,
      60
    );

    // Redirect to presigned URL
    return c.redirect(downloadUrl);
  } catch (error) {
    // Handle security errors with appropriate status codes
    if (error instanceof SecurityError) {
      return c.json(
        {
          error: 'Invalid request',
          code: error.code,
        },
        HTTP_BAD_REQUEST
      );
    }
    return c.json({ error: 'Thumbnail not found' }, HTTP_NOT_FOUND);
  }
});

const handler = new RPCHandler(appRouter);
app.use('/rpc/*', async (c, next) => {
  // Create minimal context (services now imported directly)
  const context = await createContext({ context: c });
  const { matched, response } = await handler.handle(c.req.raw, {
    prefix: '/rpc',
    context,
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }
  await next();
});

// Serve static files from web build (only in production)
if (process.env.NODE_ENV === 'production') {
  const webDistPath = join(__dirname, '../../../web/dist');
  app.use(
    '/*',
    serveStatic({
      root: webDistPath,
      onNotFound: async (path, c) => {
        // For SPA routing, return index.html for non-API routes
        if (
          !(
            path.startsWith('/rpc') ||
            path.startsWith('/upload') ||
            path.startsWith('/files') ||
            path.startsWith('/thumbnails')
          )
        ) {
          const indexContent = await Bun.file(
            join(webDistPath, 'index.html')
          ).text();
          c.html(indexContent);
        }
      },
    })
  );
}

app.get('/health', async (c) => {
  // Health check for all services
  const health = {
    cache: await cacheService.health(),
    storage: await storageService.health(),
    timestamp: new Date().toISOString(),
  };

  const isHealthy =
    health.cache.status === 'healthy' && health.storage.status === 'healthy';

  const servicesHealth = {
    ...health,
    overall: isHealthy ? 'healthy' : 'unhealthy',
  };

  return c.json({
    status: servicesHealth.overall,
    service: 'STL Shelf API',
    services: servicesHealth,
  });
});

export default app;

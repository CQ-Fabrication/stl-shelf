// import { env } from "cloudflare:workers";
import 'dotenv/config';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { RPCHandler } from '@orpc/server/fetch';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createContext } from './lib/context';
import { constructSecurePath, SecurityError, validateFilename, validateFileSize } from './lib/security';
import { appRouter } from './routers/index';
import { FileSystemService } from './services/filesystem';
import { GitService } from './services/git';

const app = new Hono();

// HTTP Status constants
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

// Data directory configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const defaultDataDir = isDevelopment ? './data' : '/data';
const dataDir = process.env.DATA_DIR || defaultDataDir;

console.log(
  `Using data directory: ${dataDir} (${isDevelopment ? 'development' : 'production'} mode)`
);

app.use(logger());
app.use(
  '/*',
  cors({
    // Improved CORS configuration - no more wildcard in production
    origin: (origin) => {
      const allowedOrigins = process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',') 
        : ['http://localhost:3001', 'http://127.0.0.1:3001'];
      
      // Allow no origin for non-browser requests (like Postman)
      if (!origin) return true;
      
      return allowedOrigins.includes(origin) ? origin : false;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

// File upload endpoint - with security and new service architecture
app.post('/upload', async (c) => {
  try {
    // Create context with shared services
    const context = await createContext({ context: c });

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
      if (key === 'files' && value instanceof File) {
        files.push(value);
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

    // Determine if this is a new model or new version
    let finalModelId: string;
    if (modelId) {
      // Check if model exists using shared filesystem service
      if (!context.services.filesystem.modelExists(modelId)) {
        return c.json({ error: 'Model not found' }, HTTP_NOT_FOUND);
      }
      finalModelId = modelId;
    } else {
      // Create new model directory with validation
      finalModelId = await context.services.filesystem.createModelDirectory(name);
    }

    const version = await context.services.filesystem.getNextVersionNumber(finalModelId);
    const versionPath = context.services.filesystem.getModelPath(finalModelId, version);

    await fs.mkdir(versionPath, { recursive: true });

    // Save uploaded files with security validation
    const savedFiles: Array<{
      filename: string;
      originalName: string;
      size: number;
      mimeType: string;
    }> = [];

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const safeFilename = validateFilename(file.name);
      const filePath = constructSecurePath(context.dataDir, finalModelId, version, safeFilename);

      await fs.writeFile(filePath, new Uint8Array(buffer));
      savedFiles.push({
        filename: safeFilename,
        originalName: file.name,
        size: buffer.byteLength,
        mimeType: file.type,
      });
    }

    // Create metadata with validation
    const metadata = {
      name,
      description: description || undefined,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      printSettings: printSettings || undefined,
    };

    // Save version-level metadata (this will sanitize inputs)
    await context.services.filesystem.saveMetadata(finalModelId, version, metadata);
    
    // Save or update model-level metadata (for the loadModelFromDirectory to work)
    await context.services.filesystem.saveMetadata(finalModelId, null, metadata);

    // Try to commit to git - but don't fail if Git has issues
    try {
      const commitMessage = modelId
        ? `Add new version ${version} for ${name}`
        : `Add ${name} ${version}`;
      await context.services.git.commitModelUpload(finalModelId, version, commitMessage);
    } catch (error) {
      console.error('Git commit failed for upload:', error.message);
      // Continue without Git - files are still saved
    }

    // Rebuild index and update cache - this is the key fix!
    await context.services.filesystem.buildIndex();

    return c.json({
      success: true,
      modelId: finalModelId,
      version,
      files: savedFiles.length,
      isNewVersion: !!modelId,
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

// File serving endpoint - with path traversal protection
app.get('/files/:modelId/:version/:filename', async (c) => {
  try {
    const { modelId, version, filename } = c.req.param();
    
    // Validate inputs and construct secure path - prevents path traversal
    const filePath = constructSecurePath(dataDir, modelId, version, filename);

    await fs.access(filePath);
    const file = await fs.readFile(filePath);

    // Validate filename again to ensure safe response headers
    const safeFilename = validateFilename(filename);

    // Set appropriate headers
    const ext = safeFilename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      stl: 'application/sla',
      obj: 'application/x-obj',
      '3mf': 'application/x-3mf',
      ply: 'application/x-ply',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };

    const mimeType = mimeTypes[ext || ''] || 'application/octet-stream';

    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${safeFilename}"`,
      },
    });
  } catch (error) {
    // Handle security errors with appropriate status codes
    if (error instanceof SecurityError) {
      return c.json({ 
        error: 'Invalid request', 
        code: error.code 
      }, HTTP_BAD_REQUEST);
    }
    return c.json({ error: 'File not found' }, HTTP_NOT_FOUND);
  }
});

// Thumbnail serving endpoint - with path traversal protection
app.get('/thumbnails/:modelId/:version', async (c) => {
  try {
    const { modelId, version } = c.req.param();
    
    // Validate inputs and construct secure path - prevents path traversal
    const thumbnailPath = constructSecurePath(dataDir, modelId, version, 'thumbnail.png');

    await fs.access(thumbnailPath);
    const file = await fs.readFile(thumbnailPath);

    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    // Handle security errors with appropriate status codes
    if (error instanceof SecurityError) {
      return c.json({ 
        error: 'Invalid request', 
        code: error.code 
      }, HTTP_BAD_REQUEST);
    }
    return c.json({ error: 'Thumbnail not found' }, HTTP_NOT_FOUND);
  }
});

const handler = new RPCHandler(appRouter);
app.use('/rpc/*', async (c, next) => {
  // Await context creation since it's now async
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
      onNotFound: (path, c) => {
        // For SPA routing, return index.html for non-API routes
        if (
          !(
            path.startsWith('/rpc') ||
            path.startsWith('/upload') ||
            path.startsWith('/files') ||
            path.startsWith('/thumbnails')
          )
        ) {
          return c.html(Bun.file(join(webDistPath, 'index.html')).text());
        }
        return;
      },
    })
  );
}

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'STL Shelf API' });
});

export default app;

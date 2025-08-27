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
import { appRouter } from './routers/index';
import { FileSystemService } from './services/filesystem';
import { GitService } from './services/git';

const app = new Hono();

// HTTP Status constants
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

// Initialize services
// In development, use ./data relative to the server directory
// In production, use /data or the specified DATA_DIR
const isDevelopment = process.env.NODE_ENV !== 'production';
const defaultDataDir = isDevelopment ? './data' : '/data';
const dataDir = process.env.DATA_DIR || defaultDataDir;

console.log(
  `Using data directory: ${dataDir} (${isDevelopment ? 'development' : 'production'} mode)`
);

const fsService = new FileSystemService(dataDir);
const gitService = new GitService(dataDir);

app.use(logger());
app.use(
  '/*',
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// File upload endpoint
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
      if (key === 'files' && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return c.json({ error: 'No files uploaded' }, HTTP_BAD_REQUEST);
    }

    // Initialize services first
    await fsService.initialize();
    await gitService.initialize({
      userEmail: process.env.GIT_USER_EMAIL,
      userName: process.env.GIT_USER_NAME,
      remoteUrl: process.env.GIT_REMOTE_URL,
    });

    // Determine if this is a new model or new version
    let finalModelId: string;
    if (modelId) {
      // Check if model exists
      const existingModel = fsService.getModel(modelId);
      if (!existingModel) {
        return c.json({ error: 'Model not found' }, HTTP_NOT_FOUND);
      }
      finalModelId = modelId;
    } else {
      // Create new model directory
      finalModelId = await fsService.createModelDirectory(name);
    }

    const version = await fsService.getNextVersionNumber(finalModelId);
    const versionPath = join(dataDir, finalModelId, version);

    await fs.mkdir(versionPath, { recursive: true });

    // Save uploaded files
    const savedFiles: Array<{
      filename: string;
      originalName: string;
      size: number;
      mimeType: string;
    }> = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const filename = file.name;
      const filePath = join(versionPath, filename);

      await fs.writeFile(filePath, new Uint8Array(buffer));
      savedFiles.push({
        filename,
        originalName: filename,
        size: buffer.byteLength,
        mimeType: file.type,
      });
    }

    // Create metadata
    const metadata = {
      name,
      description: description || undefined,
      tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      printSettings: printSettings || undefined,
    };

    // Save version-level metadata
    await fsService.saveMetadata(finalModelId, version, metadata);
    
    // Save or update model-level metadata (for the loadModelFromDirectory to work)
    await fsService.saveMetadata(finalModelId, null, metadata);

    // Commit to git
    const commitMessage = modelId
      ? `Add new version ${version} for ${name}`
      : `Add ${name} ${version}`;
    await gitService.commitModelUpload(finalModelId, version, commitMessage);

    // Rebuild index
    await fsService.buildIndex();

    return c.json({
      success: true,
      modelId: finalModelId,
      version,
      files: savedFiles.length,
      isNewVersion: !!modelId,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      HTTP_INTERNAL_SERVER_ERROR
    );
  }
});

// File serving endpoint
app.get('/files/:modelId/:version/:filename', async (c) => {
  try {
    const { modelId, version, filename } = c.req.param();
    const filePath = join(dataDir, modelId, version, filename);

    await fs.access(filePath);
    const file = await fs.readFile(filePath);

    // Set appropriate headers
    const ext = filename.split('.').pop()?.toLowerCase();
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
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (_error) {
    return c.json({ error: 'File not found' }, HTTP_NOT_FOUND);
  }
});

// Thumbnail serving endpoint
app.get('/thumbnails/:modelId/:version', async (c) => {
  try {
    const { modelId, version } = c.req.param();
    const thumbnailPath = join(dataDir, modelId, version, 'thumbnail.png');

    await fs.access(thumbnailPath);
    const file = await fs.readFile(thumbnailPath);

    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (_error) {
    return c.json({ error: 'Thumbnail not found' }, HTTP_NOT_FOUND);
  }
});

const handler = new RPCHandler(appRouter);
app.use('/rpc/*', async (c, next) => {
  const context = createContext({ context: c });
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

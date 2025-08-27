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
const dataDir = process.env.DATA_DIR || '/data';
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

    // Create model directory
    const modelId = await fsService.createModelDirectory(name);
    const version = await fsService.getNextVersionNumber(modelId);
    const versionPath = join(dataDir, modelId, version);

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
    };

    await fsService.saveMetadata(modelId, version, metadata);

    // Commit to git
    await gitService.initialize();
    await gitService.commitModelUpload(
      modelId,
      version,
      `Add ${name} ${version}`
    );

    // Rebuild index
    await fsService.buildIndex();

    return c.json({
      success: true,
      modelId,
      version,
      files: savedFiles.length,
    });
  } catch (_error) {
    return c.json({ error: 'Upload failed' }, HTTP_INTERNAL_SERVER_ERROR);
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

import type { Context } from 'hono';
import { SecurityError, validateFilename } from '@/lib/security';
import { storageService } from '@/services/storage';
import { cacheService } from '@/services/cache';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;

export async function fileServingHandler(c: Context) {
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

    // Check if this is an XHR request (from Three.js loader)
    // Return JSON instead of redirect to avoid CORS issues with credentials
    const acceptHeader = c.req.header('Accept') || '';
    const isXhr = c.req.header('X-Requested-With') === 'XMLHttpRequest';
    const wantsJson = c.req.query('format') === 'json';
    
    if (isXhr || wantsJson || acceptHeader.includes('application/json')) {
      return c.json({ url: downloadUrl });
    }

    // For regular browser requests, redirect
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
}
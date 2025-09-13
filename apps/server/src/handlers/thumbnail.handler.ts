import type { Context } from 'hono';
import { SecurityError } from '@/lib/security';
import { storageService } from '@/services/storage';
import { cacheService } from '@/services/cache';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;

export async function thumbnailHandler(c: Context) {
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
}
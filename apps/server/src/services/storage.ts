import { S3Client } from 'bun';
import { env } from '../env';

const DEFAULT_LIST_LIMIT = 1000;
const DEFAULT_EXPIRES_IN_MINUTES = 60;

/**
 * StorageService using Bun's native S3Client
 *
 * IMPORTANT LIMITATIONS:
 * - Metadata headers are not supported in write() operations
 * - File metadata must be stored separately if needed
 * - ETags are not returned from write() operations
 * - Bucket creation must be done externally (MinIO console or mc CLI)
 */
export class StorageService {
  private readonly region: string;
  private readonly endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly modelsBucket: string;
  private readonly thumbnailsBucket: string;
  private readonly tempBucket: string;

  constructor() {
    // Environment variables are validated by T3 env schema
    this.region = env.STORAGE_REGION;
    this.endpoint = env.STORAGE_ENDPOINT;
    this.accessKeyId = env.STORAGE_ACCESS_KEY;
    this.secretAccessKey = env.STORAGE_SECRET_KEY;
    this.modelsBucket = env.STORAGE_BUCKET_NAME;
    this.thumbnailsBucket = env.STORAGE_BUCKET_THUMBNAILS;
    this.tempBucket = env.STORAGE_BUCKET_TEMP;
  }

  async initialize() {
    // Ensure buckets exist
    await this.ensureBucketsExist();
  }

  private getCredentials(bucket: string) {
    const useSSL = env.STORAGE_USE_SSL === 'true';
    return {
      region: this.region,
      endpoint: `${useSSL ? 'https' : 'http'}://${this.endpoint}`,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      bucket,
    };
  }

  private async ensureBucketsExist() {
    const buckets = [
      { name: this.modelsBucket, type: 'models' },
      { name: this.thumbnailsBucket, type: 'thumbnails' },
      { name: this.tempBucket, type: 'temp' },
    ];

    const missingBuckets: string[] = [];

    for (const { name } of buckets) {
      try {
        // Test bucket accessibility by attempting to list bucket contents
        await S3Client.list({ maxKeys: 1 }, this.getCredentials(name));
      } catch {
        missingBuckets.push(name);
      }
    }

    if (missingBuckets.length > 0) {
      const bucketList = missingBuckets.join(', ');
      throw new Error(
        `Missing S3 buckets: ${bucketList}. Please create these buckets via MinIO console or mc CLI before starting the application.`
      );
    }
  }

  // File upload operations
  async uploadFile(options: {
    key: string;
    file: File | Buffer | Uint8Array;
    bucket?: string;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<{
    key: string;
    url: string;
    size: number;
    etag: string;
  }> {
    const bucket = options.bucket || this.modelsBucket;

    let data: Buffer | Uint8Array;
    let size: number;

    if (options.file instanceof File) {
      data = new Uint8Array(await options.file.arrayBuffer());
      size = options.file.size;
    } else if (Buffer.isBuffer(options.file)) {
      data = options.file;
      size = options.file.length;
    } else {
      data = options.file;
      size = options.file.length;
    }

    try {
      // Note: Bun's S3Client write() doesn't support headers or metadata
      await S3Client.write(options.key, data, this.getCredentials(bucket));

      return {
        key: options.key,
        url: this.getFileUrl(options.key, bucket),
        size,
        etag: '', // Bun's write() returns number, not object with etag
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Generate presigned URLs for direct browser uploads
  async generateUploadUrl(options: {
    key: string;
    bucket?: string;
    contentType?: string;
    expiresInMinutes?: number;
    sizeLimit?: number;
  }): Promise<{
    uploadUrl: string;
    fields: Record<string, string>;
    url: string;
  }> {
    const bucket = options.bucket || this.modelsBucket;
    const expiresIn = options.expiresInMinutes || DEFAULT_EXPIRES_IN_MINUTES;

    try {
      // Note: Bun's S3Client presign() doesn't support headers
      const uploadUrl = await S3Client.presign(options.key, {
        ...this.getCredentials(bucket),
        method: 'PUT',
        expiresIn: expiresIn * 60,
      });

      return {
        uploadUrl: uploadUrl || '',
        fields: {}, // Bun's presign doesn't use fields like AWS S3 presigned posts
        url: this.getFileUrl(options.key, bucket),
      };
    } catch (error) {
      throw new Error(
        `Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Generate presigned URLs for file downloads
  async generateDownloadUrl(
    key: string,
    bucket?: string,
    expiresInMinutes = 60
  ): Promise<string> {
    const bucketName = bucket || this.modelsBucket;

    try {
      const downloadUrl = await S3Client.presign(key, {
        ...this.getCredentials(bucketName),
        method: 'GET',
        expiresIn: expiresInMinutes * 60,
      });
      return downloadUrl || '';
    } catch (error) {
      throw new Error(
        `Failed to generate download URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // File retrieval operations
  async getFile(
    key: string,
    bucket?: string
  ): Promise<{
    body: Uint8Array;
    contentType: string;
    size: number;
    lastModified: Date;
    metadata: Record<string, string>;
  }> {
    const bucketName = bucket || this.modelsBucket;

    try {
      const result = await S3Client.file(key, this.getCredentials(bucketName));
      if (!result) {
        throw new Error(`File not found: ${key}`);
      }

      const body = new Uint8Array(await result.arrayBuffer());

      return {
        body,
        contentType: result.type || 'application/octet-stream',
        size: result.size,
        lastModified: new Date(), // Bun's file() doesn't provide lastModified, use stat() for that
        metadata: {}, // Metadata would need to be stored separately or retrieved via stat()
      };
    } catch (error) {
      throw new Error(
        `Failed to get file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async fileExists(key: string, bucket?: string): Promise<boolean> {
    const bucketName = bucket || this.modelsBucket;

    try {
      const exists = await S3Client.exists(
        key,
        this.getCredentials(bucketName)
      );
      return Boolean(exists);
    } catch {
      return false;
    }
  }

  async getFileMetadata(
    key: string,
    bucket?: string
  ): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    etag: string;
    metadata: Record<string, string>;
  }> {
    const bucketName = bucket || this.modelsBucket;

    try {
      const result = await S3Client.stat(key, this.getCredentials(bucketName));
      if (!result) {
        throw new Error(`File not found: ${key}`);
      }

      return {
        size: result.size,
        lastModified: new Date(result.lastModified || Date.now()), // Use lastModified instead of mtime
        contentType: result.type || 'application/octet-stream',
        etag: result.etag || '',
        metadata: {}, // Metadata not available in Bun's stat(), would need separate storage
      };
    } catch (error) {
      throw new Error(
        `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // File deletion
  async deleteFile(key: string, bucket?: string): Promise<void> {
    const bucketName = bucket || this.modelsBucket;

    try {
      await S3Client.delete(key, this.getCredentials(bucketName));
    } catch (error) {
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async deleteFiles(
    keys: string[],
    bucket?: string
  ): Promise<{
    deleted: string[];
    failed: Array<{ key: string; error: string }>;
  }> {
    const bucketName = bucket || this.modelsBucket;
    const deleted: string[] = [];
    const failed: Array<{ key: string; error: string }> = [];

    // Delete files individually as Bun's S3Client doesn't have bulk delete
    for (const key of keys) {
      try {
        await S3Client.delete(key, this.getCredentials(bucketName));
        deleted.push(key);
      } catch (err) {
        failed.push({
          key,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return { deleted, failed };
  }

  // List files
  async listFiles(
    options: {
      prefix?: string;
      bucket?: string;
      limit?: number;
      continuationToken?: string;
    } = {}
  ): Promise<{
    files: Array<{
      key: string;
      size: number;
      lastModified: Date;
      etag: string;
    }>;
    continuationToken?: string;
    isTruncated: boolean;
  }> {
    const bucket = options.bucket || this.modelsBucket;

    try {
      const result = await S3Client.list(
        {
          prefix: options.prefix || '',
          maxKeys: options.limit || DEFAULT_LIST_LIMIT,
        },
        this.getCredentials(bucket)
      );

      if (!result) {
        return { files: [], isTruncated: false };
      }

      if (!Array.isArray(result)) {
        return { files: [], isTruncated: false };
      }

      const files = result.map((item) => ({
        key: item.key || item.name || '',
        size: item.size || 0,
        lastModified: new Date(
          item.lastModified || item.modified || Date.now()
        ),
        etag: item.etag || '',
      }));

      return {
        files,
        continuationToken: undefined, // Bun's list doesn't support continuation tokens
        isTruncated: files.length === (options.limit || DEFAULT_LIST_LIMIT),
      };
    } catch (error) {
      throw new Error(
        `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Utility methods
  get defaultModelsBucket(): string {
    return this.modelsBucket;
  }

  get defaultThumbnailsBucket(): string {
    return this.thumbnailsBucket;
  }

  get defaultTempBucket(): string {
    return this.tempBucket;
  }

  getFileUrl(key: string, bucket?: string): string {
    const bucketName = bucket || this.modelsBucket;
    const useSSL = env.STORAGE_USE_SSL === 'true';
    return `${useSSL ? 'https' : 'http'}://${this.endpoint}/${bucketName}/${key}`;
  }

  generateStorageKey(options: {
    modelId: string;
    version?: string;
    filename: string;
    type?: 'model' | 'thumbnail' | 'temp';
  }): string {
    const { modelId, version, filename, type = 'model' } = options;
    const timestamp = Date.now();

    if (type === 'temp') {
      return `temp/${timestamp}-${filename}`;
    }

    if (version) {
      return `models/${modelId}/${version}/${filename}`;
    }

    return `models/${modelId}/${filename}`;
  }

  // Health check
  async health(): Promise<{
    status: 'healthy' | 'unhealthy';
    buckets?: string[];
  }> {
    try {
      // Test basic connectivity by checking if we can list the models bucket
      await S3Client.list(
        { maxKeys: 1 },
        this.getCredentials(this.modelsBucket)
      );

      return {
        status: 'healthy',
        buckets: [this.modelsBucket, this.thumbnailsBucket, this.tempBucket],
      };
    } catch {
      return { status: 'unhealthy' };
    }
  }
}

export const storageService = new StorageService();

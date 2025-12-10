import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env";

const DEFAULT_LIST_LIMIT = 1000;
const DEFAULT_EXPIRES_IN_MINUTES = 60;

/**
 * StorageService using AWS SDK v3 (S3-compatible)
 *
 * Works with:
 * - Cloudflare R2 (production)
 * - MinIO (local development)
 * - AWS S3
 */
export class StorageService {
  private readonly client: S3Client;
  private readonly modelsBucket: string;
  private readonly thumbnailsBucket: string;
  private readonly tempBucket: string;
  private readonly endpoint: string;

  constructor() {
    const useSSL = env.STORAGE_USE_SSL === "true";
    this.endpoint = `${useSSL ? "https" : "http"}://${env.STORAGE_ENDPOINT}`;

    this.client = new S3Client({
      region: env.STORAGE_REGION,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY,
        secretAccessKey: env.STORAGE_SECRET_KEY,
      },
      forcePathStyle: true, // Required for MinIO and R2 compatibility
    });

    this.modelsBucket = env.STORAGE_BUCKET_NAME;
    this.thumbnailsBucket = env.STORAGE_BUCKET_THUMBNAILS;
    this.tempBucket = env.STORAGE_BUCKET_TEMP;
  }

  async initialize() {
    await this.ensureBucketsExist();
  }

  private async ensureBucketsExist() {
    const buckets = [
      { name: this.modelsBucket, type: "models" },
      { name: this.thumbnailsBucket, type: "thumbnails" },
      { name: this.tempBucket, type: "temp" },
    ];

    const missingBuckets: string[] = [];

    for (const { name } of buckets) {
      try {
        await this.client.send(
          new ListObjectsV2Command({
            Bucket: name,
            MaxKeys: 1,
          })
        );
      } catch {
        missingBuckets.push(name);
      }
    }

    if (missingBuckets.length > 0) {
      const bucketList = missingBuckets.join(", ");
      throw new Error(
        `Missing S3 buckets: ${bucketList}. Please create these buckets before starting the application.`
      );
    }
  }

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

    let body: Buffer | Uint8Array;
    let size: number;

    if (options.file instanceof File) {
      body = new Uint8Array(await options.file.arrayBuffer());
      size = options.file.size;
    } else if (Buffer.isBuffer(options.file)) {
      body = options.file;
      size = options.file.length;
    } else {
      body = options.file;
      size = options.file.length;
    }

    try {
      const response = await this.client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: options.key,
          Body: body,
          ContentType: options.contentType,
          Metadata: options.metadata,
        })
      );

      return {
        key: options.key,
        url: this.getFileUrl(options.key, bucket),
        size,
        etag: response.ETag?.replace(/"/g, "") || "",
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

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
    const expiresIn = (options.expiresInMinutes || DEFAULT_EXPIRES_IN_MINUTES) * 60;

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: options.key,
        ContentType: options.contentType,
      });

      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

      return {
        uploadUrl,
        fields: {},
        url: this.getFileUrl(options.key, bucket),
      };
    } catch (error) {
      throw new Error(
        `Failed to generate upload URL: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async generateDownloadUrl(
    key: string,
    bucket?: string,
    expiresInMinutes = 60
  ): Promise<string> {
    const bucketName = bucket || this.modelsBucket;

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      return await getSignedUrl(this.client, command, {
        expiresIn: expiresInMinutes * 60,
      });
    } catch (error) {
      throw new Error(
        `Failed to generate download URL: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

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
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      );

      if (!response.Body) {
        throw new Error(`File not found: ${key}`);
      }

      const body = new Uint8Array(await response.Body.transformToByteArray());

      return {
        body,
        contentType: response.ContentType || "application/octet-stream",
        size: response.ContentLength || body.length,
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata || {},
      };
    } catch (error) {
      throw new Error(
        `Failed to get file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async fileExists(key: string, bucket?: string): Promise<boolean> {
    const bucketName = bucket || this.modelsBucket;

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      );
      return true;
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
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      );

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || "application/octet-stream",
        etag: response.ETag?.replace(/"/g, "") || "",
        metadata: response.Metadata || {},
      };
    } catch (error) {
      throw new Error(
        `Failed to get file metadata: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async deleteFile(key: string, bucket?: string): Promise<void> {
    const bucketName = bucket || this.modelsBucket;

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        })
      );
    } catch (error) {
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`
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

    if (keys.length === 0) {
      return { deleted: [], failed: [] };
    }

    try {
      const response = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
            Quiet: false,
          },
        })
      );

      const deleted = response.Deleted?.map((d) => d.Key || "") || [];
      const failed =
        response.Errors?.map((e) => ({
          key: e.Key || "",
          error: e.Message || "Unknown error",
        })) || [];

      return { deleted, failed };
    } catch (error) {
      return {
        deleted: [],
        failed: keys.map((key) => ({
          key,
          error: error instanceof Error ? error.message : "Unknown error",
        })),
      };
    }
  }

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
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: options.prefix,
          MaxKeys: options.limit || DEFAULT_LIST_LIMIT,
          ContinuationToken: options.continuationToken,
        })
      );

      const files =
        response.Contents?.map((item) => ({
          key: item.Key || "",
          size: item.Size || 0,
          lastModified: item.LastModified || new Date(),
          etag: item.ETag?.replace(/"/g, "") || "",
        })) || [];

      return {
        files,
        continuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
      };
    } catch (error) {
      throw new Error(
        `Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

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
    return `${this.endpoint}/${bucketName}/${key}`;
  }

  generateStorageKey(options: {
    organizationId: string;
    modelId: string;
    version: string;
    filename: string;
    kind?: "source" | "artifact" | "temp";
  }): string {
    const {
      organizationId,
      modelId,
      version,
      filename,
      kind = "source",
    } = options;
    const timestamp = Date.now();

    if (kind === "temp") {
      return `temp/${timestamp}-${filename}`;
    }

    const root = this.getModelVersionRoot({
      organizationId,
      modelId,
      version,
    });

    if (kind === "artifact") {
      return `${root}/artifacts/${filename}`;
    }

    return `${root}/sources/${filename}`;
  }

  getModelVersionRoot(options: {
    organizationId: string;
    modelId: string;
    version: string;
  }): string {
    const { organizationId, modelId, version } = options;
    return `${organizationId}/${modelId}/${version}`;
  }

  async health(): Promise<{
    status: "healthy" | "unhealthy";
    buckets?: string[];
  }> {
    try {
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.modelsBucket,
          MaxKeys: 1,
        })
      );

      return {
        status: "healthy",
        buckets: [this.modelsBucket, this.thumbnailsBucket, this.tempBucket],
      };
    } catch {
      return { status: "unhealthy" };
    }
  }
}

export const storageService = new StorageService();

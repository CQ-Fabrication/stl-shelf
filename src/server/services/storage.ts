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
import { env } from "@/lib/env";
import { getErrorDetails, logErrorEvent } from "@/lib/logging";

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
  private readonly bucket: string;
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
      forcePathStyle: true,
    });

    this.bucket = env.STORAGE_BUCKET_NAME;
  }

  async initialize() {
    await this.ensureBucketsExist();
  }

  private async ensureBucketsExist() {
    try {
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          MaxKeys: 1,
        }),
      );
    } catch {
      throw new Error(
        `Missing S3 bucket: ${this.bucket}. Please create this bucket before starting the application.`,
      );
    }
  }

  async uploadFile(options: {
    key: string;
    file: File | Buffer | Uint8Array;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<{
    key: string;
    url: string;
    size: number;
    etag: string;
  }> {
    const bucket = this.bucket;

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
        }),
      );

      return {
        key: options.key,
        url: this.getFileUrl(options.key),
        size,
        etag: response.ETag?.replace(/"/g, "") || "",
      };
    } catch (error) {
      logErrorEvent("error.storage.upload_failed", {
        storageKey: options.key,
        operation: "upload",
        ...getErrorDetails(error),
      });
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async generateUploadUrl(options: {
    key: string;
    contentType?: string;
    expiresInMinutes?: number;
  }): Promise<{
    uploadUrl: string;
    fields: Record<string, string>;
    url: string;
  }> {
    const bucket = this.bucket;
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
        url: this.getFileUrl(options.key),
      };
    } catch (error) {
      logErrorEvent("error.storage.upload_failed", {
        storageKey: options.key,
        operation: "generate_upload_url",
        ...getErrorDetails(error),
      });
      throw new Error(
        `Failed to generate upload URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async generateDownloadUrl(key: string, expiresInMinutes = 60): Promise<string> {
    const bucketName = this.bucket;

    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      return await getSignedUrl(this.client, command, {
        expiresIn: expiresInMinutes * 60,
      });
    } catch (error) {
      logErrorEvent("error.storage.download_failed", {
        storageKey: key,
        operation: "generate_download_url",
        ...getErrorDetails(error),
      });
      throw new Error(
        `Failed to generate download URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getFile(key: string): Promise<{
    body: Uint8Array;
    contentType: string;
    size: number;
    lastModified: Date;
    metadata: Record<string, string>;
  }> {
    const bucketName = this.bucket;

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
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
      logErrorEvent("error.storage.download_failed", {
        storageKey: key,
        operation: "get_file",
        ...getErrorDetails(error),
      });
      throw new Error(
        `Failed to get file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get file as a readable stream for efficient streaming (e.g., ZIP creation)
   * Does NOT load entire file into memory
   */
  async getFileStream(key: string): Promise<ReadableStream<Uint8Array>> {
    const bucketName = this.bucket;

    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error(`File not found: ${key}`);
      }

      // AWS SDK v3 returns a web-compatible ReadableStream
      return response.Body.transformToWebStream();
    } catch (error) {
      logErrorEvent("error.storage.download_failed", {
        storageKey: key,
        operation: "get_file_stream",
        ...getErrorDetails(error),
      });
      throw new Error(
        `Failed to get file stream: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async fileExists(key: string): Promise<boolean> {
    const bucketName = this.bucket;

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getFileMetadata(key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    etag: string;
    metadata: Record<string, string>;
  }> {
    const bucketName = this.bucket;

    try {
      const response = await this.client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || "application/octet-stream",
        etag: response.ETag?.replace(/"/g, "") || "",
        metadata: response.Metadata || {},
      };
    } catch (error) {
      logErrorEvent("error.storage.download_failed", {
        storageKey: key,
        operation: "get_metadata",
        ...getErrorDetails(error),
      });
      throw new Error(
        `Failed to get file metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    const bucketName = this.bucket;

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async deleteFiles(keys: string[]): Promise<{
    deleted: string[];
    failed: Array<{ key: string; error: string }>;
  }> {
    const bucketName = this.bucket;

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
        }),
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
      limit?: number;
      continuationToken?: string;
    } = {},
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
    const bucket = this.bucket;

    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: options.prefix,
          MaxKeys: options.limit || DEFAULT_LIST_LIMIT,
          ContinuationToken: options.continuationToken,
        }),
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
        `Failed to list files: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  get defaultBucket(): string {
    return this.bucket;
  }

  getFileUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  generateStorageKey(options: {
    organizationId: string;
    modelId: string;
    version: string;
    filename: string;
    kind?: "source" | "artifact" | "temp" | "slicer";
  }): string {
    const { organizationId, modelId, version, filename, kind = "source" } = options;
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

    if (kind === "slicer") {
      return `${root}/slicer/${filename}`;
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
    bucket?: string;
  }> {
    try {
      await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          MaxKeys: 1,
        }),
      );

      return {
        status: "healthy",
        bucket: this.bucket,
      };
    } catch {
      return { status: "unhealthy" };
    }
  }
}

export const storageService = new StorageService();

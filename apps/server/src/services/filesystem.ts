import { promises as fs } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { parseSTL } from '@amandaghassaei/stl-parser';

// Regex patterns for version parsing
const VERSION_REGEX = /v(\d+)/;

import type {
  BoundingBox,
  Model,
  ModelFile,
  ModelListQuery,
  ModelListResponse,
  ModelMetadata,
  ModelVersion,
} from '../types/model';

export class FileSystemService {
  private readonly dataDir: string;
  private readonly indexCache: Map<string, Model> = new Map();
  private lastIndexUpdate = 0;

  constructor(dataDir = '/data') {
    this.dataDir = dataDir;
  }

  async initialize(): Promise<void> {
    await this.ensureDataDirectory();
    await this.buildIndex();
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  async buildIndex(): Promise<void> {
    this.indexCache.clear();

    try {
      const entries = await fs.readdir(this.dataDir, { withFileTypes: true });
      const modelDirs = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'));

      for (const dir of modelDirs) {
        try {
          const model = await this.loadModelFromDirectory(dir.name);
          if (model) {
            this.indexCache.set(model.id, model);
          }
        } catch (_error) {
          // Ignore invalid model directories
        }
      }
    } catch (_error) {
      // Ignore directory read errors
    }

    this.lastIndexUpdate = Date.now();
  }

  private async loadModelFromDirectory(dirName: string): Promise<Model | null> {
    const modelPath = join(this.dataDir, dirName);
    const metaPath = join(modelPath, 'meta.json');

    // Check if meta.json exists
    try {
      await fs.access(metaPath);
    } catch {
      return null; // Not a valid model directory
    }

    // Load versions
    const versions: ModelVersion[] = [];
    const entries = await fs.readdir(modelPath, { withFileTypes: true });
    const versionDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('v'))
      .sort((a, b) => this.compareVersions(a.name, b.name));

    for (const versionDir of versionDirs) {
      const version = await this.loadVersionFromDirectory(
        join(modelPath, versionDir.name),
        versionDir.name
      );
      if (version) {
        versions.push(version);
      }
    }

    if (versions.length === 0) {
      return null;
    }

    // Load base metadata
    const _metadata = await this.loadMetadata(metaPath);
    const latestVersion = versions.at(-1);

    if (!latestVersion) {
      throw new Error(`No versions found for model ${dirName}`);
    }

    const model: Model = {
      id: dirName,
      slug: this.generateSlug(dirName),
      currentVersion: latestVersion.version,
      versions,
      totalVersions: versions.length,
      latestMetadata: latestVersion.metadata,
      createdAt: versions[0].createdAt,
      updatedAt: latestVersion.createdAt,
    };

    return model;
  }

  private async loadVersionFromDirectory(
    versionPath: string,
    versionName: string
  ): Promise<ModelVersion | null> {
    try {
      const entries = await fs.readdir(versionPath);
      const files: ModelFile[] = [];

      // Load all model files
      for (const filename of entries) {
        if (this.isModelFile(filename)) {
          const filePath = join(versionPath, filename);
          const file = await this.analyzeFile(filePath, filename);
          files.push(file);
        }
      }

      if (files.length === 0) {
        return null;
      }

      // Load version metadata
      const metaPath = join(versionPath, 'meta.json');
      let metadata: ModelMetadata;

      try {
        metadata = await this.loadMetadata(metaPath);
      } catch {
        // Create default metadata if none exists
        const stats = await fs.stat(versionPath);
        metadata = {
          name: basename(versionPath),
          tags: [],
          createdAt: stats.ctime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
        };
      }

      // Check for thumbnail
      const thumbnailPath = join(versionPath, 'thumbnail.png');
      let hasThumbnail = false;
      try {
        await fs.access(thumbnailPath);
        hasThumbnail = true;
      } catch {
        // biome-ignore lint/correctness/noConstantCondition: hasThumbnail is conditionally set based on file existence check
        // No thumbnail exists
      }

      const version: ModelVersion = {
        version: versionName,
        files,
        metadata,
        thumbnailPath: hasThumbnail
          ? `${versionName}/thumbnail.png`
          : undefined,
        createdAt: metadata.createdAt,
      };

      return version;
    } catch (_error) {
      return null;
    }
  }

  private async analyzeFile(
    filePath: string,
    filename: string
  ): Promise<ModelFile> {
    const stats = await fs.stat(filePath);
    const extension = extname(filename).toLowerCase();

    const file: ModelFile = {
      filename,
      originalName: filename,
      size: stats.size,
      mimeType: this.getMimeType(extension),
      extension,
    };

    // Analyze 3D files for geometry info
    if (extension === '.stl') {
      try {
        const analysisResult = await this.analyzeSTLFile(filePath);
        if (analysisResult) {
          file.boundingBox = analysisResult.boundingBox.size;
          file.triangleCount = analysisResult.triangleCount;
        }
      } catch (_error) {
        // Ignore STL analysis errors - file will have basic info only
      }
    }

    return file;
  }

  private async analyzeSTLFile(
    filePath: string
  ): Promise<{ boundingBox: BoundingBox; triangleCount: number } | null> {
    try {
      const buffer = await fs.readFile(filePath);

      // Parse STL file using proper parser - it already calculates bounding box
      const arrayBuffer = new ArrayBuffer(buffer.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      uint8Array.set(buffer);
      const mesh = parseSTL(arrayBuffer);

      if (!mesh?.vertices || mesh.vertices.length === 0) {
        return null;
      }

      // Use the parser's built-in bounding box
      const { boundingBox: bbox } = mesh;
      const boundingBox: BoundingBox = {
        min: { x: bbox.min[0], y: bbox.min[1], z: bbox.min[2] },
        max: { x: bbox.max[0], y: bbox.max[1], z: bbox.max[2] },
        size: {
          width: bbox.max[0] - bbox.min[0],
          height: bbox.max[1] - bbox.min[1],
          depth: bbox.max[2] - bbox.min[2],
        },
      };

      // Calculate triangle count from vertices (each triangle has 3 vertices, 3 coords each = 9 elements)
      const VERTICES_PER_TRIANGLE = 3;
      const COORDS_PER_VERTEX = 3;
      const ELEMENTS_PER_TRIANGLE = VERTICES_PER_TRIANGLE * COORDS_PER_VERTEX;
      const triangleCount = mesh.vertices.length / ELEMENTS_PER_TRIANGLE;

      return {
        boundingBox,
        triangleCount,
      };
    } catch (_error) {
      return null;
    }
  }

  private async loadMetadata(metaPath: string): Promise<ModelMetadata> {
    const content = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private compareVersions(a: string, b: string): number {
    const getVersionNumber = (version: string) => {
      const match = version.match(VERSION_REGEX);
      return match ? Number.parseInt(match[1], 10) : 0;
    };
    return getVersionNumber(a) - getVersionNumber(b);
  }

  private isModelFile(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return ['.stl', '.obj', '.3mf', '.ply'].includes(ext);
  }

  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.stl': 'application/sla',
      '.obj': 'application/x-obj',
      '.3mf': 'application/x-3mf',
      '.ply': 'application/x-ply',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  // Public API methods
  async listModels(query: ModelListQuery): Promise<ModelListResponse> {
    // Refresh index if it's older than 5 minutes
    const CACHE_MINUTES = 5;
    const SECONDS_PER_MINUTE = 60;
    const MS_PER_SECOND = 1000;
    const CACHE_TIMEOUT = CACHE_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;

    if (Date.now() - this.lastIndexUpdate > CACHE_TIMEOUT) {
      await this.buildIndex();
    }

    let models = Array.from(this.indexCache.values());

    // Apply search filter
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      models = models.filter(
        (model) =>
          model.latestMetadata.name.toLowerCase().includes(searchLower) ||
          model.latestMetadata.description
            ?.toLowerCase()
            .includes(searchLower) ||
          model.latestMetadata.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
      );
    }

    // Apply tag filter
    if (query.tags && query.tags.length > 0) {
      models = models.filter((model) =>
        query.tags?.some((tag) => model.latestMetadata.tags.includes(tag))
      );
    }

    // Apply sorting
    models.sort((a, b) => {
      let comparison = 0;
      switch (query.sortBy) {
        case 'name':
          comparison = a.latestMetadata.name.localeCompare(
            b.latestMetadata.name
          );
          break;
        case 'createdAt':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'size': {
          const aSize =
            a.versions.at(-1)?.files.reduce((sum, f) => sum + f.size, 0) || 0;
          const bSize =
            b.versions.at(-1)?.files.reduce((sum, f) => sum + f.size, 0) || 0;
          comparison = aSize - bSize;
          break;
        }
        default:
          comparison = 0;
          break;
      }
      return query.sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const total = models.length;
    const totalPages = Math.ceil(total / query.limit);
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedModels = models.slice(startIndex, endIndex);

    return {
      models: paginatedModels,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  getModel(id: string): Model | null {
    return this.indexCache.get(id) || null;
  }

  async createModelDirectory(name: string): Promise<string> {
    // Generate safe directory name
    const sanitizedName = name
      .replace(/[^a-zA-Z0-9\-_\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();

    // Ensure unique directory name
    let counter = 0;
    let dirName = sanitizedName;
    while (this.indexCache.has(dirName)) {
      counter++;
      dirName = `${sanitizedName}-${counter}`;
    }

    const modelPath = join(this.dataDir, dirName);
    await fs.mkdir(modelPath, { recursive: true });

    return dirName;
  }

  async getNextVersionNumber(modelId: string): Promise<string> {
    const model = await this.getModel(modelId);
    if (!model) {
      return 'v1';
    }

    const maxVersion = Math.max(
      ...model.versions.map((v) => {
        const match = v.version.match(VERSION_REGEX);
        return match ? Number.parseInt(match[1], 10) : 0;
      })
    );

    return `v${maxVersion + 1}`;
  }

  async saveMetadata(
    modelId: string,
    version: string | null,
    metadata: ModelMetadata
  ): Promise<void> {
    const modelPath = join(this.dataDir, modelId);
    const metaPath = version
      ? join(modelPath, version, 'meta.json')
      : join(modelPath, 'meta.json');

    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
  }

  getModelPath(modelId: string, version?: string): string {
    const modelPath = join(this.dataDir, modelId);
    return version ? join(modelPath, version) : modelPath;
  }

  async deleteModel(modelId: string): Promise<void> {
    const modelPath = join(this.dataDir, modelId);
    await fs.rm(modelPath, { recursive: true, force: true });
    this.indexCache.delete(modelId);
  }

  async deleteVersion(modelId: string, version: string): Promise<void> {
    const versionPath = join(this.dataDir, modelId, version);
    await fs.rm(versionPath, { recursive: true, force: true });

    // Rebuild the model in cache
    const model = await this.loadModelFromDirectory(modelId);
    if (model) {
      this.indexCache.set(modelId, model);
    } else {
      this.indexCache.delete(modelId);
    }
  }
}

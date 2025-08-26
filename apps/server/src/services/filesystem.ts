import { promises as fs } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parseSTL } from '@amandaghassaei/stl-parser';
import type {
	Model,
	ModelFile,
	ModelVersion,
	ModelMetadata,
	FileSystemModel,
	BoundingBox,
	ModelListQuery,
	ModelListResponse,
} from '../types/model';

export class FileSystemService {
	private dataDir: string;
	private indexCache: Map<string, Model> = new Map();
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
		console.log('Building model index...');
		this.indexCache.clear();
		
		try {
			const entries = await fs.readdir(this.dataDir, { withFileTypes: true });
			const modelDirs = entries.filter(entry => entry.isDirectory());

			for (const dir of modelDirs) {
				try {
					const model = await this.loadModelFromDirectory(dir.name);
					if (model) {
						this.indexCache.set(model.id, model);
					}
				} catch (error) {
					console.warn(`Failed to load model from ${dir.name}:`, error);
				}
			}
		} catch (error) {
			console.error('Failed to build index:', error);
		}

		this.lastIndexUpdate = Date.now();
		console.log(`Index built with ${this.indexCache.size} models`);
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
			.filter(entry => entry.isDirectory() && entry.name.startsWith('v'))
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
		const metadata = await this.loadMetadata(metaPath);
		const latestVersion = versions[versions.length - 1];

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

	private async loadVersionFromDirectory(versionPath: string, versionName: string): Promise<ModelVersion | null> {
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
				// No thumbnail exists
			}

			const version: ModelVersion = {
				version: versionName,
				files,
				metadata,
				thumbnailPath: hasThumbnail ? `${versionName}/thumbnail.png` : undefined,
				createdAt: metadata.createdAt,
			};

			return version;
		} catch (error) {
			console.warn(`Failed to load version ${versionName}:`, error);
			return null;
		}
	}

	private async analyzeFile(filePath: string, filename: string): Promise<ModelFile> {
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
			} catch (error) {
				console.warn(`Failed to analyze STL file ${filename}:`, error);
			}
		}

		return file;
	}

	private async analyzeSTLFile(filePath: string): Promise<{ boundingBox: BoundingBox; triangleCount: number } | null> {
		try {
			const buffer = await fs.readFile(filePath);
			
			// Parse STL file using proper parser
			const mesh = parseSTL(buffer.buffer);
			
			if (!mesh || !mesh.positions || mesh.positions.length === 0) {
				return null;
			}

			// Calculate bounding box from vertices
			let minX = Number.POSITIVE_INFINITY;
			let minY = Number.POSITIVE_INFINITY;
			let minZ = Number.POSITIVE_INFINITY;
			let maxX = Number.NEGATIVE_INFINITY;
			let maxY = Number.NEGATIVE_INFINITY;
			let maxZ = Number.NEGATIVE_INFINITY;

			// Positions array contains [x1, y1, z1, x2, y2, z2, ...]
			for (let i = 0; i < mesh.positions.length; i += 3) {
				const x = mesh.positions[i];
				const y = mesh.positions[i + 1];
				const z = mesh.positions[i + 2];

				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				minZ = Math.min(minZ, z);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
				maxZ = Math.max(maxZ, z);
			}

			const boundingBox: BoundingBox = {
				min: { x: minX, y: minY, z: minZ },
				max: { x: maxX, y: maxY, z: maxZ },
				size: {
					width: maxX - minX,
					height: maxY - minY,
					depth: maxZ - minZ,
				},
			};

			// Calculate triangle count (each triangle has 3 vertices)
			const triangleCount = mesh.positions.length / 9;

			return {
				boundingBox,
				triangleCount,
			};
		} catch (error) {
			console.warn(`Failed to analyze STL file:`, error);
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
			const match = version.match(/v(\d+)/);
			return match ? parseInt(match[1], 10) : 0;
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
		if (Date.now() - this.lastIndexUpdate > 5 * 60 * 1000) {
			await this.buildIndex();
		}

		let models = Array.from(this.indexCache.values());

		// Apply search filter
		if (query.search) {
			const searchLower = query.search.toLowerCase();
			models = models.filter(model =>
				model.latestMetadata.name.toLowerCase().includes(searchLower) ||
				model.latestMetadata.description?.toLowerCase().includes(searchLower) ||
				model.latestMetadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
			);
		}

		// Apply tag filter
		if (query.tags && query.tags.length > 0) {
			models = models.filter(model =>
				query.tags!.some(tag => model.latestMetadata.tags.includes(tag))
			);
		}

		// Apply sorting
		models.sort((a, b) => {
			let comparison = 0;
			switch (query.sortBy) {
				case 'name':
					comparison = a.latestMetadata.name.localeCompare(b.latestMetadata.name);
					break;
				case 'createdAt':
					comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
					break;
				case 'updatedAt':
					comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
					break;
				case 'size':
					const aSize = a.versions[a.versions.length - 1].files.reduce((sum, f) => sum + f.size, 0);
					const bSize = b.versions[b.versions.length - 1].files.reduce((sum, f) => sum + f.size, 0);
					comparison = aSize - bSize;
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

	async getModel(id: string): Promise<Model | null> {
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
			...model.versions.map(v => {
				const match = v.version.match(/v(\d+)/);
				return match ? parseInt(match[1], 10) : 0;
			})
		);

		return `v${maxVersion + 1}`;
	}

	async saveMetadata(modelId: string, version: string | null, metadata: ModelMetadata): Promise<void> {
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
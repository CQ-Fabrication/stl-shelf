# STL Shelf Metadata Structure

This document provides a comprehensive overview of the metadata structure used by STL Shelf to manage 3D model files, versions, and associated information.

## Overview

STL Shelf uses a **dual-level metadata system** to organize 3D models:

1. **Model-Level Metadata**: Stored at the root of each model directory
2. **Version-Level Metadata**: Stored within each version subdirectory

This structure allows for both unified model information and version-specific details.

## Directory Structure

```
data/
├── model-id-1/
│   ├── meta.json              # Model-level metadata
│   ├── v1/
│   │   ├── meta.json          # Version-level metadata
│   │   ├── model-file.stl     # 3D model files
│   │   └── thumbnail.png      # Optional thumbnail
│   ├── v2/
│   │   ├── meta.json
│   │   └── improved-model.stl
│   └── v3/
│       ├── meta.json
│       └── final-model.stl
└── model-id-2/
    ├── meta.json
    └── v1/
        ├── meta.json
        └── another-model.stl
```

## Model-Level Metadata

**Location**: `/data/{model-id}/meta.json`

**Purpose**: Contains the core model information that applies across all versions.

**Content**: Represents the latest/current metadata for the model.

```json
{
  "name": "Model Name",
  "description": "Optional model description",
  "tags": ["tag1", "tag2", "tag3"],
  "createdAt": "2025-08-27T06:29:16.291Z",
  "updatedAt": "2025-08-27T06:29:16.291Z",
  "printSettings": {
    "material": "PLA",
    "layerHeight": 0.2,
    "infill": 20,
    "printTime": 120,
    "weight": 25.5
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Display name of the model |
| `description` | string | ❌ | Optional description or notes |
| `tags` | string[] | ❌ | Array of searchable tags (default: []) |
| `createdAt` | string | ✅ | ISO datetime when model was first created |
| `updatedAt` | string | ✅ | ISO datetime when model was last modified |
| `printSettings` | object | ❌ | 3D printing configuration |

### Print Settings Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `material` | string | ❌ | Printing material (e.g., "PLA", "ABS", "PETG") |
| `layerHeight` | number | ❌ | Layer height in millimeters |
| `infill` | number | ❌ | Infill percentage (0-100) |
| `printTime` | number | ❌ | Estimated print time in minutes |
| `weight` | number | ❌ | Estimated material weight in grams |

## Version-Level Metadata

**Location**: `/data/{model-id}/{version}/meta.json`

**Purpose**: Contains version-specific metadata that may differ between versions.

**Content**: Same structure as model-level metadata, but specific to that version.

```json
{
  "name": "Model Name v2 - Improved",
  "description": "Fixed the mounting holes in this version",
  "tags": ["tag1", "tag2", "improved"],
  "createdAt": "2025-08-27T07:15:22.123Z",
  "updatedAt": "2025-08-27T07:15:22.123Z",
  "printSettings": {
    "material": "PETG",
    "layerHeight": 0.15,
    "infill": 25,
    "printTime": 145,
    "weight": 28.2
  }
}
```

## In-Memory Model Structure

When loaded by the filesystem service, models are represented in memory with additional computed fields:

```typescript
interface Model {
  id: string;                    // Directory name (e.g., "sample-model")
  slug: string;                  // URL-friendly identifier
  currentVersion: string;        // Latest version (e.g., "v3")
  versions: ModelVersion[];      // Array of all versions
  totalVersions: number;         // Count of versions
  latestMetadata: ModelMetadata; // Metadata from the latest version
  createdAt: string;            // From earliest version
  updatedAt: string;            // From latest version
}
```

### Model Version Structure

```typescript
interface ModelVersion {
  version: string;              // Version identifier (e.g., "v1")
  files: ModelFile[];          // Array of files in this version
  metadata: ModelMetadata;     // Version-specific metadata
  thumbnailPath?: string;      // Path to thumbnail image
  createdAt: string;          // Version creation timestamp
}
```

### Model File Structure

```typescript
interface ModelFile {
  filename: string;           // Current filename
  originalName: string;       // Original uploaded filename
  size: number;              // File size in bytes
  mimeType: string;          // MIME type (e.g., "model/stl")
  extension: string;         // File extension (e.g., ".stl")
  boundingBox?: {            // 3D dimensions (if analyzed)
    width: number;
    height: number;
    depth: number;
  };
  triangleCount?: number;    // Number of triangles (STL files)
}
```

## Metadata Lifecycle

### 1. Model Upload

When a new model is uploaded:

1. **Directory Creation**: `/data/{generated-id}/` is created
2. **Version Directory**: `/data/{generated-id}/v1/` is created
3. **Files Storage**: Model files are saved in the version directory
4. **Version Metadata**: `meta.json` is created in the version directory
5. **Model Metadata**: Same `meta.json` is copied to the model root directory

### 2. Version Upload

When a new version is uploaded to an existing model:

1. **Version Directory**: `/data/{model-id}/v{n}/` is created
2. **Files Storage**: New version files are saved
3. **Version Metadata**: New `meta.json` created in version directory
4. **Model Metadata Update**: Root `meta.json` is updated with latest metadata

### 3. Metadata Updates

When model metadata is updated via the API:

1. **Version Update**: Specific version's `meta.json` is updated
2. **Model Update**: If updating the latest version, root `meta.json` is also updated
3. **Index Refresh**: In-memory cache is updated

## API Integration

### Saving Metadata

The `FileSystemService.saveMetadata()` method handles both levels:

```typescript
// Save to version directory
await fsService.saveMetadata(modelId, "v1", metadata);

// Save to model root (for index loading)
await fsService.saveMetadata(modelId, null, metadata);
```

### Loading Models

The `loadModelFromDirectory()` method requires both files to exist:

1. **Model Check**: Verifies `/data/{model-id}/meta.json` exists
2. **Version Discovery**: Scans for `v*` directories
3. **Version Loading**: Loads each version's metadata and files
4. **Model Assembly**: Combines all versions into a single Model object

## Git Integration

### Versioning Strategy

- Each model directory is tracked as a Git repository
- Model files are tracked with Git LFS (Large File Storage)
- Metadata files are tracked with regular Git
- Each upload creates a Git commit with descriptive message

### LFS Configuration

The following file types are tracked with Git LFS:

```gitattributes
*.stl filter=lfs diff=lfs merge=lfs -text
*.STL filter=lfs diff=lfs merge=lfs -text
*.obj filter=lfs diff=lfs merge=lfs -text
*.OBJ filter=lfs diff=lfs merge=lfs -text
*.3mf filter=lfs diff=lfs merge=lfs -text
*.3MF filter=lfs diff=lfs merge=lfs -text
*.ply filter=lfs diff=lfs merge=lfs -text
*.PLY filter=lfs diff=lfs merge=lfs -text
```

Regular files (like `meta.json`, thumbnails) use standard Git tracking.

## Error Handling

### Missing Metadata

If metadata files are missing:

- **Missing Model-Level**: Model is not loaded into index (404 on access)
- **Missing Version-Level**: Version is skipped during loading
- **Invalid JSON**: Version/Model is skipped with error logging

### Recovery Strategies

1. **Regenerate Model Metadata**: Copy from latest version
2. **Validate Schema**: Ensure all required fields are present
3. **Rebuild Index**: Force refresh of in-memory model cache

## Schema Validation

All metadata is validated using Zod schemas defined in `/apps/server/src/types/model.ts`:

- `ModelMetadataSchema`: Base metadata structure
- `ModelFileSchema`: File information structure  
- `ModelVersionSchema`: Version structure with files
- `ModelSchema`: Complete model with all versions

## Performance Considerations

### Index Caching

- Models are loaded into memory on server startup
- Index is rebuilt when filesystem changes are detected
- Large model collections may require pagination

### File Analysis

- 3D file analysis (bounding box, triangle count) is optional
- Analysis is performed during upload, not on every request
- Results are cached in metadata to avoid recomputation

## Migration and Compatibility

### Version Updates

When updating the metadata schema:

1. Update Zod schemas in `model.ts`
2. Implement migration logic in filesystem service
3. Add backward compatibility for existing models
4. Provide migration scripts for bulk updates

### Example Migration

```typescript
// Migrate old metadata format to new format
private async migrateMetadata(metadata: any): Promise<ModelMetadata> {
  return {
    name: metadata.title || metadata.name, // Handle old 'title' field
    description: metadata.desc || metadata.description,
    tags: metadata.tags || [],
    createdAt: metadata.created || new Date().toISOString(),
    updatedAt: metadata.updated || new Date().toISOString(),
    printSettings: metadata.printing || metadata.printSettings,
  };
}
```

## Troubleshooting

### Common Issues

1. **Model Not Loading**: Check if both `meta.json` files exist
2. **Version Missing**: Ensure version directory follows `v{number}` pattern
3. **Invalid Metadata**: Validate JSON syntax and required fields
4. **Index Out of Sync**: Restart server to rebuild model index

### Debug Commands

```bash
# Check model structure
ls -la data/model-id/

# Validate JSON syntax
cat data/model-id/meta.json | json_pp

# Check Git LFS files
cd data && git lfs ls-files

# Force index rebuild
curl -X POST http://localhost:3000/admin/rebuild-index
```

This dual metadata structure ensures both efficient model discovery and detailed version management while maintaining Git compatibility and API performance.
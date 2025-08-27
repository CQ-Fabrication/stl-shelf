# STL Shelf API Integration Guide

This document explains how the metadata structure integrates with the API endpoints and provides examples for developers working with the STL Shelf system.

## API Endpoints Overview

### Model Management

| Endpoint | Method | Description | Metadata Impact |
|----------|--------|-------------|-----------------|
| `/rpc/listModels` | POST | List all models with pagination | Reads model-level metadata |
| `/rpc/getModel` | POST | Get single model with all versions | Reads both metadata levels |
| `/rpc/getModelHistory` | POST | Get Git history for a model | No metadata access |
| `/rpc/updateModelMetadata` | POST | Update model metadata | Updates both metadata levels |
| `/rpc/deleteModel` | POST | Delete entire model | Removes all metadata |
| `/rpc/deleteModelVersion` | POST | Delete specific version | Removes version metadata |
| `/upload` | POST | Upload model files | Creates both metadata levels |

### File Management

| Endpoint | Method | Description | Metadata Impact |
|----------|--------|-------------|-----------------|
| `/rpc/getModelFile` | POST | Get file info for download | Reads file metadata |
| `/files/{modelId}/{version}/{filename}` | GET | Download model file | No metadata access |

## Metadata Flow in API Operations

### 1. Model Upload (`/upload`)

**Input**: Form data with model files and metadata
**Metadata Operations**:

1. **Extract Metadata**: Parse form fields into `ModelMetadata` structure
2. **Generate Model ID**: Create unique identifier from model name
3. **Version Assignment**: Determine next version number (v1, v2, etc.)
4. **File Analysis**: Analyze uploaded files for size, type, geometry
5. **Version Metadata Save**: Store metadata in version directory
6. **Model Metadata Save**: Store metadata in model root directory
7. **Git Commit**: Commit changes with LFS tracking

```typescript
// Metadata creation during upload
const metadata: ModelMetadata = {
  name: formData.name,
  description: formData.description || undefined,
  tags: JSON.parse(formData.tags || '[]'),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  printSettings: formData.printSettings ? JSON.parse(formData.printSettings) : undefined,
};

// Save at both levels
await fsService.saveMetadata(modelId, version, metadata); // Version level
await fsService.saveMetadata(modelId, null, metadata);    // Model level
```

### 2. Model Listing (`/rpc/listModels`)

**Input**: Query parameters (pagination, search, filters)
**Metadata Operations**:

1. **Index Access**: Read from in-memory model cache
2. **Filtering**: Apply search and tag filters on metadata
3. **Sorting**: Sort by metadata fields (name, createdAt, updatedAt)
4. **Pagination**: Slice results based on page/limit
5. **Response Assembly**: Return models with latest metadata

```typescript
// Filtering by metadata fields
if (input.search) {
  models = models.filter((model) =>
    model.latestMetadata.name.toLowerCase().includes(input.search!.toLowerCase()) ||
    model.latestMetadata.description?.toLowerCase().includes(input.search!.toLowerCase()) ||
    model.latestMetadata.tags.some(tag => tag.toLowerCase().includes(input.search!.toLowerCase()))
  );
}

// Sorting by metadata fields
models.sort((a, b) => {
  switch (input.sortBy) {
    case 'name':
      return a.latestMetadata.name.localeCompare(b.latestMetadata.name);
    case 'createdAt':
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    case 'updatedAt':
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  }
});
```

### 3. Model Retrieval (`/rpc/getModel`)

**Input**: Model ID
**Metadata Operations**:

1. **Cache Lookup**: Find model in in-memory index
2. **Validation**: Ensure model exists and is complete
3. **Version Assembly**: Include all versions with their metadata
4. **File Information**: Include file details for each version

```typescript
// Model structure returned by API
interface APIModelResponse {
  id: string;
  slug: string;
  currentVersion: string;
  totalVersions: number;
  createdAt: string;
  updatedAt: string;
  latestMetadata: {
    name: string;
    description?: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    printSettings?: PrintSettings;
  };
  versions: Array<{
    version: string;
    createdAt: string;
    thumbnailPath?: string;
    metadata: ModelMetadata;
    files: Array<{
      filename: string;
      originalName: string;
      size: number;
      mimeType: string;
      extension: string;
      boundingBox?: { width: number; height: number; depth: number };
      triangleCount?: number;
    }>;
  }>;
}
```

### 4. Metadata Update (`/rpc/updateModelMetadata`)

**Input**: Model ID, optional version, metadata updates
**Metadata Operations**:

1. **Target Identification**: Determine if updating model or version level
2. **Validation**: Validate metadata against schema
3. **File Update**: Write updated metadata to appropriate location
4. **Cache Refresh**: Update in-memory model representation
5. **Git Commit**: Commit metadata changes

```typescript
// Update specific version metadata
if (input.version) {
  await fsService.saveMetadata(input.modelId, input.version, input.metadata);
  
  // If updating latest version, also update model-level metadata
  const model = fsService.getModel(input.modelId);
  if (model && model.currentVersion === input.version) {
    await fsService.saveMetadata(input.modelId, null, input.metadata);
  }
} else {
  // Update model-level metadata only
  await fsService.saveMetadata(input.modelId, null, input.metadata);
}
```

## Frontend Integration

### Model Display Components

The frontend components consume the API metadata for display:

```typescript
// Model card component using metadata
interface ModelCardProps {
  model: Model;
}

function ModelCard({ model }: ModelCardProps) {
  const { latestMetadata } = model;
  
  return (
    <Card>
      <h3>{latestMetadata.name}</h3>
      <p>{latestMetadata.description}</p>
      <div className="tags">
        {latestMetadata.tags.map(tag => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
      <div className="metadata">
        <span>Created: {formatDate(model.createdAt)}</span>
        <span>Updated: {formatDate(model.updatedAt)}</span>
        <span>Versions: {model.totalVersions}</span>
      </div>
    </Card>
  );
}
```

### Print Settings Display

```typescript
function PrintSettingsPanel({ printSettings }: { printSettings?: PrintSettings }) {
  if (!printSettings) return null;
  
  return (
    <div className="print-settings">
      {printSettings.material && (
        <div>Material: {printSettings.material}</div>
      )}
      {printSettings.layerHeight && (
        <div>Layer Height: {printSettings.layerHeight}mm</div>
      )}
      {printSettings.infill && (
        <div>Infill: {printSettings.infill}%</div>
      )}
      {printSettings.printTime && (
        <div>Print Time: {Math.floor(printSettings.printTime / 60)}h {printSettings.printTime % 60}m</div>
      )}
      {printSettings.weight && (
        <div>Weight: {printSettings.weight}g</div>
      )}
    </div>
  );
}
```

### Version History Display

```typescript
function VersionHistory({ model }: { model: Model }) {
  return (
    <div className="version-history">
      {model.versions.map((version) => (
        <div key={version.version} className="version-item">
          <h4>{version.version}</h4>
          <p>{version.metadata.name}</p>
          <span>{formatDate(version.createdAt)}</span>
          <div className="files">
            {version.files.map((file) => (
              <div key={file.filename}>
                {file.originalName} ({formatFileSize(file.size)})
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

### Metadata Validation Errors

```typescript
// API error responses for invalid metadata
{
  "json": {
    "defined": false,
    "code": "BAD_REQUEST",
    "status": 400,
    "message": "Input validation failed",
    "data": {
      "issues": [
        {
          "path": ["name"],
          "message": "Required field 'name' is missing",
          "code": "invalid_type"
        }
      ]
    }
  }
}
```

### Model Not Found Errors

```typescript
// Proper 404 response for missing models
{
  "json": {
    "defined": false,
    "code": "NOT_FOUND", 
    "status": 404,
    "message": "Model with id 'nonexistent-model' not found"
  }
}
```

## Performance Optimizations

### Index Caching Strategy

1. **Startup Loading**: All models loaded into memory on server start
2. **Lazy Evaluation**: File analysis performed only when needed
3. **Change Detection**: Index rebuilt only when filesystem changes detected
4. **Memory Management**: Large models paginated to prevent memory issues

### Metadata Caching

```typescript
class FileSystemService {
  private readonly indexCache: Map<string, Model> = new Map();
  private lastIndexUpdate: number = 0;
  
  async getModel(id: string): Promise<Model | null> {
    // Return from cache if available
    return this.indexCache.get(id) || null;
  }
  
  async rebuildIndexIfNeeded(): Promise<void> {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (now - this.lastIndexUpdate > maxAge) {
      await this.buildIndex();
    }
  }
}
```

## Development Workflow

### Adding New Metadata Fields

1. **Update Schema**: Add field to `ModelMetadataSchema` in `model.ts`
2. **Update Types**: Regenerate TypeScript types
3. **Migration**: Add migration logic for existing models
4. **API Updates**: Update endpoints to handle new field
5. **Frontend Updates**: Update UI components to display new field

### Example: Adding License Field

```typescript
// 1. Update schema
export const ModelMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  license: z.string().optional(), // New field
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  printSettings: z.object({...}).optional(),
});

// 2. Update migration
private async migrateMetadata(metadata: any): Promise<ModelMetadata> {
  return {
    ...metadata,
    license: metadata.license || "CC BY 4.0", // Default license
  };
}

// 3. Update frontend
function ModelDetails({ model }: { model: Model }) {
  return (
    <div>
      <h1>{model.latestMetadata.name}</h1>
      {model.latestMetadata.license && (
        <div>License: {model.latestMetadata.license}</div>
      )}
    </div>
  );
}
```

## Testing

### Metadata Validation Tests

```typescript
describe('Metadata Validation', () => {
  test('should validate required fields', () => {
    const invalidMetadata = { description: "Missing name" };
    expect(() => ModelMetadataSchema.parse(invalidMetadata)).toThrow();
  });
  
  test('should accept valid metadata', () => {
    const validMetadata = {
      name: "Test Model",
      tags: ["test"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => ModelMetadataSchema.parse(validMetadata)).not.toThrow();
  });
});
```

### API Integration Tests

```typescript
describe('Model API', () => {
  test('should return 404 for nonexistent model', async () => {
    const response = await client.getModel.mutate({ id: 'nonexistent' });
    expect(response.status).toBe(404);
    expect(response.error.code).toBe('NOT_FOUND');
  });
  
  test('should return model with metadata', async () => {
    const model = await client.getModel.mutate({ id: 'sample-model' });
    expect(model.latestMetadata.name).toBeDefined();
    expect(model.versions.length).toBeGreaterThan(0);
  });
});
```

This comprehensive API integration guide should help developers understand how metadata flows through the entire system from upload to display.
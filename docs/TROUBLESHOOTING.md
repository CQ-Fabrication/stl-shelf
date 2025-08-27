# STL Shelf Troubleshooting Guide

This document covers common issues related to the metadata structure, model loading, and API interactions in STL Shelf.

## Common Issues and Solutions

### 1. Models Not Loading / 404 Errors

**Symptoms:**
- Models exist in data directory but return 404 from API
- `getModel` endpoint returns "Model not found" error
- Models don't appear in listing

**Root Causes:**
- Missing model-level metadata file
- Invalid JSON syntax in metadata files
- Incorrect directory permissions
- Index cache out of sync

**Diagnostic Steps:**

```bash
# Check if model directory exists
ls -la data/your-model-id/

# Verify both metadata files exist
ls -la data/your-model-id/meta.json
ls -la data/your-model-id/v1/meta.json

# Validate JSON syntax
cat data/your-model-id/meta.json | json_pp
cat data/your-model-id/v1/meta.json | json_pp

# Check directory permissions
ls -ld data/your-model-id/
```

**Solutions:**

1. **Missing Model-Level Metadata:**
```bash
# Copy version metadata to model level
cp "data/your-model-id/v1/meta.json" "data/your-model-id/meta.json"
```

2. **Invalid JSON Syntax:**
```bash
# Fix JSON syntax errors manually or regenerate
# Ensure all strings are quoted, no trailing commas, etc.
```

3. **Force Index Rebuild:**
```bash
# Restart the server to rebuild model index
# Or implement /admin/rebuild-index endpoint
```

### 2. Version Upload Failures

**Symptoms:**
- New versions don't appear in model history
- Upload succeeds but version is missing
- Inconsistent version numbering

**Root Causes:**
- Version directory creation failure
- Metadata save failure
- Git commit failure
- File permission issues

**Diagnostic Steps:**

```bash
# Check all version directories
ls -la data/your-model-id/

# Verify version metadata exists
find data/your-model-id/ -name "meta.json" -exec ls -la {} \;

# Check Git status
cd data && git status
cd data && git log --oneline -5
```

**Solutions:**

1. **Manual Version Creation:**
```bash
# Create missing version directory
mkdir -p "data/your-model-id/v2"

# Copy files to version directory
cp "uploaded-file.stl" "data/your-model-id/v2/"

# Create version metadata
cat > "data/your-model-id/v2/meta.json" << EOF
{
  "name": "Model Name v2",
  "description": "Updated version",
  "tags": ["tag1", "tag2"],
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
}
EOF

# Update model-level metadata
cp "data/your-model-id/v2/meta.json" "data/your-model-id/meta.json"
```

### 3. Metadata Schema Validation Errors

**Symptoms:**
- API returns 400 errors with validation messages
- Upload fails with schema validation error
- Model updates are rejected

**Common Schema Issues:**

1. **Missing Required Fields:**
```json
// ❌ Invalid - missing required fields
{
  "description": "Only description provided"
}

// ✅ Valid - includes required fields
{
  "name": "Model Name",
  "createdAt": "2025-08-27T06:29:16.291Z",
  "updatedAt": "2025-08-27T06:29:16.291Z"
}
```

2. **Invalid Date Format:**
```json
// ❌ Invalid - wrong date format
{
  "name": "Model Name",
  "createdAt": "2025-08-27 06:29:16",
  "updatedAt": "Aug 27, 2025"
}

// ✅ Valid - ISO 8601 format
{
  "name": "Model Name", 
  "createdAt": "2025-08-27T06:29:16.291Z",
  "updatedAt": "2025-08-27T06:29:16.291Z"
}
```

3. **Invalid Print Settings:**
```json
// ❌ Invalid - wrong data types
{
  "printSettings": {
    "layerHeight": "0.2",  // Should be number
    "infill": "20%"        // Should be number, not string
  }
}

// ✅ Valid - correct data types
{
  "printSettings": {
    "layerHeight": 0.2,
    "infill": 20
  }
}
```

**Solutions:**

1. **Schema Validation Tool:**
```typescript
// Validate metadata before saving
import { ModelMetadataSchema } from './types/model';

function validateMetadata(metadata: any): boolean {
  try {
    ModelMetadataSchema.parse(metadata);
    return true;
  } catch (error) {
    console.error('Validation failed:', error);
    return false;
  }
}
```

2. **Fix Common Issues:**
```bash
# Fix date formats using jq
cat data/model/meta.json | jq '.createdAt = now | strftime("%Y-%m-%dT%H:%M:%S.%3NZ")' > temp.json && mv temp.json data/model/meta.json

# Ensure tags is an array
cat data/model/meta.json | jq '.tags = (.tags // [])' > temp.json && mv temp.json data/model/meta.json
```

### 4. Git Integration Issues

**Symptoms:**
- Upload succeeds but no Git commit created
- Git LFS errors during upload
- Model files not tracked properly

**Root Causes:**
- Git LFS not installed or configured
- Git repository not initialized in data directory
- Git user configuration missing
- LFS file patterns not configured

**Diagnostic Steps:**

```bash
# Check Git LFS installation
which git-lfs
git lfs version

# Check data directory Git status
cd data && git status
cd data && git lfs ls-files

# Check Git configuration
cd data && git config --list

# Check LFS configuration
cd data && cat .gitattributes
```

**Solutions:**

1. **Install Git LFS:**
```bash
# macOS
brew install git-lfs

# Ubuntu/Debian
sudo apt install git-lfs

# Initialize LFS
git lfs install
```

2. **Initialize Data Directory:**
```bash
cd data
git init
git lfs track "*.stl" "*.obj" "*.3mf" "*.ply"
git add .gitattributes
git commit -m "Initialize Git LFS tracking"
```

3. **Fix Git Configuration:**
```bash
cd data
git config user.name "STL Shelf"
git config user.email "stl-shelf@localhost"
```

### 5. File Permission Issues

**Symptoms:**
- Cannot create model directories
- Cannot save metadata files
- File access errors in logs

**Diagnostic Steps:**

```bash
# Check data directory permissions
ls -ld data/
ls -la data/

# Check if user can write to directory
touch data/test-file && rm data/test-file

# Check process user
whoami
ps aux | grep node
```

**Solutions:**

```bash
# Fix directory permissions
chmod 755 data/
chmod 644 data/*/meta.json
chmod 644 data/*/v*/meta.json

# Change ownership if needed
sudo chown -R $(whoami) data/
```

### 6. Performance Issues

**Symptoms:**
- Slow model listing
- High memory usage
- Timeout on large model collections

**Root Causes:**
- Large number of models in index
- Memory leak in model caching
- Inefficient file analysis

**Diagnostic Steps:**

```bash
# Check model count
find data/ -name "meta.json" -path "*/v*" | wc -l

# Monitor memory usage
top -p $(pgrep node)

# Check file sizes
du -sh data/*/
```

**Solutions:**

1. **Implement Pagination:**
```typescript
// Paginate model listing
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

async function listModels(query: ModelListQuery) {
  const { page, limit } = query;
  const offset = (page - 1) * limit;
  
  // Paginate results to reduce memory usage
  return {
    models: allModels.slice(offset, offset + limit),
    pagination: {
      page,
      limit,
      total: allModels.length,
      totalPages: Math.ceil(allModels.length / limit)
    }
  };
}
```

2. **Lazy File Analysis:**
```typescript
// Only analyze files when specifically requested
async function analyzeFileOnDemand(filePath: string) {
  if (this.analysisCache.has(filePath)) {
    return this.analysisCache.get(filePath);
  }
  
  const analysis = await this.performFileAnalysis(filePath);
  this.analysisCache.set(filePath, analysis);
  return analysis;
}
```

### 7. Search and Filtering Issues

**Symptoms:**
- Search returns no results
- Tags not filtering correctly
- Sort order incorrect

**Root Causes:**
- Case sensitivity issues
- Array handling problems
- Date parsing issues

**Solutions:**

1. **Case-Insensitive Search:**
```typescript
// Fix search case sensitivity
if (input.search) {
  const searchTerm = input.search.toLowerCase();
  models = models.filter((model) => 
    model.latestMetadata.name.toLowerCase().includes(searchTerm) ||
    model.latestMetadata.description?.toLowerCase().includes(searchTerm) ||
    model.latestMetadata.tags.some(tag => 
      tag.toLowerCase().includes(searchTerm)
    )
  );
}
```

2. **Tag Filtering:**
```typescript
// Fix tag array filtering
if (input.tags && input.tags.length > 0) {
  models = models.filter((model) =>
    input.tags!.some(tag => 
      model.latestMetadata.tags.includes(tag)
    )
  );
}
```

## Prevention Best Practices

### 1. Validation at Upload

```typescript
// Always validate metadata before saving
async function uploadModel(formData: FormData) {
  const metadata = extractMetadata(formData);
  
  // Validate schema
  const validationResult = ModelMetadataSchema.safeParse(metadata);
  if (!validationResult.success) {
    throw new ValidationError(validationResult.error);
  }
  
  // Ensure required fields have sensible defaults
  const finalMetadata = {
    ...validationResult.data,
    tags: validationResult.data.tags || [],
    createdAt: validationResult.data.createdAt || new Date().toISOString(),
    updatedAt: validationResult.data.updatedAt || new Date().toISOString(),
  };
  
  await saveModel(finalMetadata);
}
```

### 2. Atomic Operations

```typescript
// Ensure metadata consistency with atomic operations
async function saveModelMetadata(modelId: string, version: string, metadata: ModelMetadata) {
  const transaction = await this.beginTransaction();
  
  try {
    // Save version metadata
    await this.saveMetadata(modelId, version, metadata);
    
    // Save model metadata
    await this.saveMetadata(modelId, null, metadata);
    
    // Update index cache
    await this.rebuildModelIndex(modelId);
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### 3. Health Checks

```typescript
// Add health check endpoint
app.get('/health/metadata', async (c) => {
  const issues = [];
  
  // Check for models without model-level metadata
  const models = await fs.readdir(dataDir, { withFileTypes: true });
  for (const model of models.filter(d => d.isDirectory())) {
    const metaPath = join(dataDir, model.name, 'meta.json');
    try {
      await fs.access(metaPath);
    } catch {
      issues.push(`Missing model metadata: ${model.name}`);
    }
  }
  
  return c.json({
    status: issues.length === 0 ? 'healthy' : 'degraded',
    issues
  });
});
```

### 4. Monitoring and Logging

```typescript
// Add structured logging for metadata operations
class FileSystemService {
  private logger = winston.createLogger({
    format: winston.format.json(),
    transports: [
      new winston.transports.File({ filename: 'metadata.log' })
    ]
  });
  
  async saveMetadata(modelId: string, version: string | null, metadata: ModelMetadata) {
    this.logger.info('Saving metadata', {
      modelId,
      version,
      operation: 'save_metadata',
      timestamp: new Date().toISOString()
    });
    
    try {
      await this.performSaveMetadata(modelId, version, metadata);
      
      this.logger.info('Metadata saved successfully', {
        modelId,
        version,
        operation: 'save_metadata_success'
      });
    } catch (error) {
      this.logger.error('Failed to save metadata', {
        modelId,
        version,
        operation: 'save_metadata_error',
        error: error.message
      });
      throw error;
    }
  }
}
```

This troubleshooting guide should help developers quickly identify and resolve common metadata-related issues in STL Shelf.
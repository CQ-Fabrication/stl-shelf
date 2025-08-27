# STL Shelf Migration Guide

This document provides guidance for migrating existing STL Shelf installations, updating metadata schemas, and handling data structure changes.

## Migration Overview

STL Shelf uses a dual-level metadata system that may require migration when:
- Upgrading between major versions
- Changing metadata schema structure
- Fixing missing metadata files
- Converting from single-level to dual-level metadata

## Current Migration Scenarios

### 1. Single-Level to Dual-Level Metadata Migration

**Background**: Early versions of STL Shelf only stored version-level metadata. The current system requires both model-level and version-level metadata files.

**When Needed**:
- Upgrading from versions before dual-level metadata
- Models showing 404 errors despite existing files
- Missing `/data/{model-id}/meta.json` files

**Detection Script**:

```bash
#!/bin/bash
# detect-missing-metadata.sh

echo "Scanning for models missing model-level metadata..."

for model_dir in data/*/; do
    if [ -d "$model_dir" ]; then
        model_id=$(basename "$model_dir")
        model_meta="$model_dir/meta.json"
        
        if [ ! -f "$model_meta" ]; then
            echo "Missing model metadata: $model_id"
            
            # Check if version metadata exists
            version_meta="$model_dir/v1/meta.json"
            if [ -f "$version_meta" ]; then
                echo "  - Found version metadata at v1/"
            else
                echo "  - No version metadata found!"
            fi
        fi
    fi
done
```

**Automated Migration**:

```bash
#!/bin/bash
# migrate-to-dual-metadata.sh

echo "Migrating models to dual-level metadata system..."

for model_dir in data/*/; do
    if [ -d "$model_dir" ]; then
        model_id=$(basename "$model_dir")
        model_meta="$model_dir/meta.json"
        
        if [ ! -f "$model_meta" ]; then
            echo "Migrating model: $model_id"
            
            # Find latest version metadata
            latest_version=""
            latest_meta=""
            
            for version_dir in "$model_dir"/v*/; do
                if [ -d "$version_dir" ]; then
                    version=$(basename "$version_dir")
                    version_meta="$version_dir/meta.json"
                    
                    if [ -f "$version_meta" ]; then
                        latest_version="$version"
                        latest_meta="$version_meta"
                    fi
                fi
            done
            
            if [ -n "$latest_meta" ]; then
                echo "  Copying metadata from $latest_version to model level"
                cp "$latest_meta" "$model_meta"
            else
                echo "  ERROR: No version metadata found for $model_id"
            fi
        fi
    fi
done

echo "Migration complete. Restart the server to rebuild the index."
```

### 2. Schema Version Migration

**Adding New Fields**:

When adding new fields to the metadata schema, existing models need to be migrated to include default values.

**Example: Adding License Field**

1. **Update Schema** (`apps/server/src/types/model.ts`):
```typescript
export const ModelMetadataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  license: z.string().optional(), // New field
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  printSettings: z.object({...}).optional(),
});
```

2. **Create Migration Function**:
```typescript
// apps/server/src/migrations/add-license-field.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

interface OldMetadata {
  name: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  printSettings?: any;
}

interface NewMetadata extends OldMetadata {
  license?: string;
}

export async function migrateLicenseField(dataDir: string, defaultLicense = "CC BY 4.0") {
  const models = await fs.readdir(dataDir, { withFileTypes: true });
  
  for (const model of models.filter(d => d.isDirectory() && !d.name.startsWith('.'))) {
    const modelDir = join(dataDir, model.name);
    
    // Migrate model-level metadata
    await migrateSingleMetadataFile(
      join(modelDir, 'meta.json'), 
      defaultLicense
    );
    
    // Migrate version-level metadata
    const versions = await fs.readdir(modelDir, { withFileTypes: true });
    for (const version of versions.filter(d => d.isDirectory() && d.name.startsWith('v'))) {
      await migrateSingleMetadataFile(
        join(modelDir, version.name, 'meta.json'),
        defaultLicense
      );
    }
  }
}

async function migrateSingleMetadataFile(metaPath: string, defaultLicense: string) {
  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    const metadata: OldMetadata = JSON.parse(content);
    
    // Add license field if missing
    const newMetadata: NewMetadata = {
      ...metadata,
      license: metadata.license || defaultLicense
    };
    
    await fs.writeFile(metaPath, JSON.stringify(newMetadata, null, 2));
    console.log(`Migrated: ${metaPath}`);
  } catch (error) {
    console.error(`Failed to migrate ${metaPath}:`, error);
  }
}
```

3. **Run Migration**:
```typescript
// apps/server/src/migrations/index.ts
import { migrateLicenseField } from './add-license-field';

export async function runMigrations(dataDir: string) {
  console.log('Running metadata migrations...');
  
  // Run migrations in order
  await migrateLicenseField(dataDir, "CC BY-SA 4.0");
  
  console.log('Migrations completed.');
}
```

### 3. Data Structure Changes

**Changing Directory Structure**:

If the directory structure needs to change (e.g., adding year-based organization), create a migration script.

**Example: Adding Year-Based Organization**

```bash
#!/bin/bash
# migrate-year-structure.sh

echo "Migrating to year-based directory structure..."

# Create year directories
mkdir -p data/2023 data/2024 data/2025

for model_dir in data/*/; do
    model_id=$(basename "$model_dir")
    
    # Skip year directories
    if [[ "$model_id" =~ ^[0-9]{4}$ ]]; then
        continue
    fi
    
    if [ -d "$model_dir" ]; then
        # Get creation year from metadata
        meta_file="$model_dir/meta.json"
        if [ -f "$meta_file" ]; then
            year=$(cat "$meta_file" | jq -r '.createdAt' | cut -d'-' -f1)
            
            if [[ "$year" =~ ^[0-9]{4}$ ]]; then
                echo "Moving $model_id to $year/"
                mv "$model_dir" "data/$year/"
            else
                echo "Warning: Could not determine year for $model_id"
                mv "$model_dir" "data/unknown/"
            fi
        fi
    fi
done

echo "Migration complete. Update DATA_DIR paths in your configuration."
```

## Backup and Recovery

### Pre-Migration Backup

Always backup your data before running migrations:

```bash
#!/bin/bash
# backup-before-migration.sh

backup_dir="backup-$(date +%Y%m%d-%H%M%S)"
echo "Creating backup at $backup_dir..."

# Create backup directory
mkdir -p "$backup_dir"

# Copy entire data directory
cp -r data/ "$backup_dir/"

# Create backup metadata
cat > "$backup_dir/backup-info.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "models_count": $(find data/ -name "meta.json" -path "*/v*" | wc -l),
  "total_size": "$(du -sh data/ | cut -f1)"
}
EOF

echo "Backup created successfully at $backup_dir"
echo "Models backed up: $(cat $backup_dir/backup-info.json | jq -r '.models_count')"
echo "Total size: $(cat $backup_dir/backup-info.json | jq -r '.total_size')"
```

### Recovery Process

If migration fails, restore from backup:

```bash
#!/bin/bash
# restore-from-backup.sh

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-directory>"
    echo "Available backups:"
    ls -d backup-* 2>/dev/null || echo "No backups found"
    exit 1
fi

backup_dir="$1"

if [ ! -d "$backup_dir" ]; then
    echo "Error: Backup directory $backup_dir not found"
    exit 1
fi

echo "Restoring from backup: $backup_dir"

# Show backup info
if [ -f "$backup_dir/backup-info.json" ]; then
    echo "Backup info:"
    cat "$backup_dir/backup-info.json" | jq .
fi

read -p "Continue with restore? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Stop server if running
echo "Stopping server..."
pkill -f "bun.*server" || true

# Remove current data
echo "Removing current data..."
rm -rf data/

# Restore from backup
echo "Restoring data..."
cp -r "$backup_dir/data" .

echo "Restore completed. Restart the server."
```

## Migration Testing

### Validation Script

Create a script to validate migration results:

```bash
#!/bin/bash
# validate-migration.sh

echo "Validating migration results..."

errors=0
warnings=0

# Check for models without model-level metadata
echo "Checking for missing model-level metadata..."
for model_dir in data/*/; do
    if [ -d "$model_dir" ] && [[ ! $(basename "$model_dir") =~ ^[0-9]{4}$ ]]; then
        model_id=$(basename "$model_dir")
        model_meta="$model_dir/meta.json"
        
        if [ ! -f "$model_meta" ]; then
            echo "ERROR: Missing model metadata: $model_id"
            errors=$((errors + 1))
        else
            # Validate JSON syntax
            if ! cat "$model_meta" | jq . >/dev/null 2>&1; then
                echo "ERROR: Invalid JSON in $model_id/meta.json"
                errors=$((errors + 1))
            fi
        fi
    fi
done

# Check for orphaned version directories
echo "Checking for orphaned versions..."
for version_dir in data/*/v*/; do
    if [ -d "$version_dir" ]; then
        model_dir=$(dirname "$version_dir")
        model_id=$(basename "$model_dir")
        version=$(basename "$version_dir")
        
        if [ ! -f "$model_dir/meta.json" ]; then
            echo "WARNING: Version $version has no model metadata: $model_id"
            warnings=$((warnings + 1))
        fi
    fi
done

# Summary
echo ""
echo "Validation complete:"
echo "  Errors: $errors"
echo "  Warnings: $warnings"

if [ $errors -gt 0 ]; then
    echo "Migration validation FAILED. Fix errors before proceeding."
    exit 1
else
    echo "Migration validation PASSED."
    exit 0
fi
```

### API Testing

Test API endpoints after migration:

```bash
#!/bin/bash
# test-api-after-migration.sh

server_url="http://localhost:3000"

echo "Testing API endpoints after migration..."

# Test health endpoint
echo "Testing health endpoint..."
if curl -sf "$server_url/health" >/dev/null; then
    echo "✓ Health endpoint OK"
else
    echo "✗ Health endpoint failed"
    exit 1
fi

# Test model listing
echo "Testing model listing..."
response=$(curl -s -X POST "$server_url/rpc/listModels" \
    -H "Content-Type: application/json" \
    -d '{"page":1,"limit":10,"sortBy":"name","sortOrder":"asc"}')

if echo "$response" | jq -e '.models' >/dev/null 2>&1; then
    model_count=$(echo "$response" | jq -r '.models | length')
    echo "✓ Model listing OK ($model_count models)"
else
    echo "✗ Model listing failed"
    echo "Response: $response"
    exit 1
fi

# Test individual model retrieval
if [ "$model_count" -gt 0 ]; then
    model_id=$(echo "$response" | jq -r '.models[0].id')
    echo "Testing model retrieval for: $model_id"
    
    model_response=$(curl -s -X POST "$server_url/rpc/getModel" \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"$model_id\"}")
    
    if echo "$model_response" | jq -e '.id' >/dev/null 2>&1; then
        echo "✓ Model retrieval OK"
    else
        echo "✗ Model retrieval failed"
        echo "Response: $model_response"
        exit 1
    fi
fi

echo "All API tests passed!"
```

## Automated Migration Pipeline

### CI/CD Integration

For production deployments, integrate migrations into your CI/CD pipeline:

```yaml
# .github/workflows/deploy.yml
name: Deploy STL Shelf

on:
  push:
    tags: [ 'v*' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        
      - name: Install dependencies
        run: bun install
        
      - name: Run migrations
        run: |
          # Backup current data
          ./scripts/backup-before-migration.sh
          
          # Run migrations
          bun run migrate
          
          # Validate migration
          ./scripts/validate-migration.sh
          
      - name: Deploy application
        run: |
          # Deploy to production
          bun run build
          bun run deploy
```

### Migration Script Integration

Add migration commands to package.json:

```json
{
  "scripts": {
    "migrate": "bun run apps/server/src/migrations/index.ts",
    "migrate:validate": "./scripts/validate-migration.sh",
    "migrate:backup": "./scripts/backup-before-migration.sh",
    "migrate:restore": "./scripts/restore-from-backup.sh"
  }
}
```

## Version-Specific Migration Notes

### v1.0 to v2.0

- **Breaking Change**: Introduced dual-level metadata system
- **Migration**: Run `migrate-to-dual-metadata.sh`
- **Validation**: Check all models have both metadata files

### v2.0 to v2.1

- **Addition**: Added license field to metadata schema
- **Migration**: Optional - defaults will be used for missing fields
- **Backward Compatibility**: Maintained

### v2.1 to v3.0

- **Breaking Change**: Changed directory structure to year-based
- **Migration**: Run `migrate-year-structure.sh`
- **Configuration**: Update DATA_DIR paths

## Best Practices

### 1. Always Backup First
- Create full backup before any migration
- Test restore process before starting migration
- Keep backups for multiple versions

### 2. Test in Staging
- Run migrations in staging environment first
- Validate all functionality works correctly
- Load test with production-like data

### 3. Gradual Rollout
- Migrate in batches if dealing with large datasets
- Monitor system health during migration
- Have rollback plan ready

### 4. Communication
- Notify users of planned maintenance
- Document any breaking changes
- Provide migration timeline and expected downtime

### 5. Monitoring
- Monitor system resources during migration
- Log all migration operations
- Alert on migration failures

This migration guide should help ensure smooth transitions between STL Shelf versions while maintaining data integrity.
# Print Profiles Feature Specification

> Multi-printer print profile support for STL-Shelf

## Overview

Enable users with multiple printers to store printer-specific 3MF slicer files for each model version, with automatic metadata extraction from multiple slicers (Bambu Studio, PrusaSlicer, OrcaSlicer).

## Problem

Print farms with multiple printer models need different print configurations for the same STL:

- Different settings per printer (quality, speed, reliability)
- Material constraints (certain printers handle materials better)
- Build volume optimization (scaling, orientation, copies per plate)
- Production routing (quickly grab correct profile when printing)

**Current limitation:** `modelVersions.printSettings` is a single JSONB field — only one profile per version.

## Solution

Add **Print Profiles** as version-scoped 3MF file attachments with auto-extracted metadata from multiple slicer formats.

---

## Key Decisions

### Business

- **Profile scope**: Version-scoped only (no cross-version sharing)
- **Storage quota**: Single unified quota (profiles count same as source files)
- **3MF storage**: Full file must be stored (downloading is core feature)
- **API exposure**: UI only for v1 (no API endpoints)
- **ZIP export**: Include all profiles when exporting version as ZIP

### Technical

- **Multi-slicer**: Support Bambu Studio, PrusaSlicer, OrcaSlicer
- **Parser architecture**: Pluggable (separate parser per slicer)
- **Security**: Strict allowlist for ZIP extraction paths
- **Unknown formats**: Store as regular file only (not profile)
- **Conflict matching**: Fuzzy at 80%+ similarity threshold
- **Cascade behavior**: Delete profile → deletes linked 3MF file
- **Ordering**: Alphabetical by printer name
- **Filament display**: Summary string for multi-material (e.g., "2x PLA (Red, Blue)")

### UX

- **Layout**: Tabs (Source Files | Print Profiles)
- **Upload detection**: Auto-detect 3MF → profiles, other formats → source files
- **Multi-file upload**: Supported, batch conflict resolution at end
- **Conflict message**: Simple "similar printer exists" (don't expose algorithm)
- **No thumbnail**: Text-only card (no server-side generation fallback)
- **Toast feedback**: Simple "Profile uploaded" message
- **Download**: As-is (no metadata stripping - users only download their own)
- **Unknown slicer**: Inline form in profile card to collect user feedback
- **Empty state**: Explanatory text + upload button

---

## Data Model

### New Table: `print_profiles`

```typescript
// src/lib/db/schema/models.ts

export const printProfiles = pgTable("print_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id")
    .notNull()
    .references(() => modelVersions.id, { onDelete: "cascade" }),
  printerName: text("printer_name").notNull(), // Extracted from 3MF or "Unknown Printer"
  printerNameNormalized: text("printer_name_normalized").notNull(), // For fuzzy matching
  fileId: uuid("file_id")
    .notNull()
    .references(() => modelFiles.id, { onDelete: "cascade" }),
  thumbnailPath: text("thumbnail_path"), // R2 storage path (nullable)
  slicerType: text("slicer_type"), // "bambu" | "prusa" | "orca" | "unknown"
  metadata: jsonb("metadata").$type<PrintProfileMetadata>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Indexes
export const printProfilesVersionIdx = index("print_profiles_version_idx").on(
  printProfiles.versionId,
);
export const printProfilesPrinterIdx = index("print_profiles_printer_idx").on(
  printProfiles.printerNameNormalized,
);
```

### Metadata Type

```typescript
// src/types/print-profiles.ts

export type PrintProfileMetadata = {
  printTime: number | null; // seconds
  filamentSummary: string | null; // "PLA (Red)" or "2x PLA (Red, Blue) + PETG"
  settings: {
    layerHeight: number | null; // mm
    infill: number | null; // percentage (0-100)
    nozzleTemp: number | null; // celsius
    bedTemp: number | null; // celsius
  } | null;
  plateInfo: {
    count: number; // number of plates
    copiesPerPlate: number; // items per plate
  } | null;
  filamentWeight: number | null; // grams (total across all materials)
};

export type SlicerType = "bambu" | "prusa" | "orca" | "unknown";
```

### Relationships

```
Model
└── Version (design iteration)
    ├── model_files (source: STL, OBJ)
    └── print_profiles
        ├── Profile 1 (X1C) → links to 3MF file in model_files
        ├── Profile 2 (A1 Mini) → links to 3MF file
        └── Profile 3 (Prusa MK4) → links to 3MF file
```

- `print_profiles` → `model_versions`: Many-to-one (cascade delete)
- `print_profiles` → `model_files`: One-to-one (cascade delete)

---

## 3MF Parser Service

### Architecture

```
src/server/services/parsers/
├── index.ts              # Main parser entry point
├── types.ts              # Shared types
├── bambu-parser.ts       # Bambu Studio 3MF parser
├── prusa-parser.ts       # PrusaSlicer 3MF parser
├── orca-parser.ts        # OrcaSlicer 3MF parser
└── utils.ts              # Shared utilities (ZIP extraction, normalization)
```

### Interface

```typescript
// src/server/services/parsers/types.ts

export type ParsedProfile = {
  printerName: string;
  printerNameNormalized: string;
  thumbnail: Buffer | null;
  slicerType: SlicerType;
  metadata: PrintProfileMetadata;
};

export type Parse3MFResult =
  | { success: true; data: ParsedProfile }
  | { success: false; reason: "unknown_format" | "parse_error"; error?: string };

export interface SlicerParser {
  canParse(zipContents: ZipContents): boolean;
  parse(zipContents: ZipContents): Promise<ParsedProfile>;
}
```

### Security: Strict Allowlist

Only extract these paths from 3MF archives:

```typescript
const ALLOWED_PATHS = [
  // Bambu Studio / OrcaSlicer
  "Metadata/model_settings.config",
  "Metadata/plate_1.json",
  "Metadata/plate_1.png",
  "Metadata/thumbnail.png",

  // PrusaSlicer
  "slic3r_pe.config",
  "Metadata/thumbnail.png",
  "Thumbnails/thumbnail.png",
];
```

Reject any file attempting path traversal (`../`, absolute paths).

### Parser Registration

```typescript
// src/server/services/parsers/index.ts

import { BambuParser } from "./bambu-parser";
import { PrusaParser } from "./prusa-parser";
import { OrcaParser } from "./orca-parser";

const parsers: SlicerParser[] = [
  new BambuParser(),
  new OrcaParser(), // Must come after Bambu (similar format)
  new PrusaParser(),
];

export async function parse3MFFromBuffer(buffer: Buffer): Promise<Parse3MFResult> {
  const zipContents = await extractAllowedFiles(buffer);

  for (const parser of parsers) {
    if (parser.canParse(zipContents)) {
      try {
        const data = await parser.parse(zipContents);
        return { success: true, data };
      } catch (error) {
        // Parser matched but failed, try next
        continue;
      }
    }
  }

  return { success: false, reason: "unknown_format" };
}
```

### Printer Name Normalization

```typescript
// src/server/services/parsers/utils.ts

export function normalizePrinterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "") // Remove spaces
    .replace(/[^a-z0-9]/g, ""); // Remove special chars
}

export function calculateSimilarity(a: string, b: string): number {
  // Levenshtein distance converted to percentage
  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

export function isConflict(name1: string, name2: string): boolean {
  const normalized1 = normalizePrinterName(name1);
  const normalized2 = normalizePrinterName(name2);
  return calculateSimilarity(normalized1, normalized2) >= 0.8;
}
```

---

## Upload Flow Integration

### Modified Flow

```typescript
// src/server/services/models/model-file.service.ts

async function uploadFile(
  file: File,
  versionId: string,
  organizationId: string,
): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = getExtension(file.name);

  // Auto-detect: 3MF → profiles, others → source files
  if (extension === "3mf") {
    return upload3MFWithProfile(buffer, file.name, versionId, organizationId);
  }

  return uploadStandardFile(buffer, file.name, versionId, organizationId);
}

async function upload3MFWithProfile(
  buffer: Buffer,
  filename: string,
  versionId: string,
  organizationId: string,
): Promise<UploadResult> {
  // 1. Parse 3MF
  const parseResult = await parse3MFFromBuffer(buffer);

  if (!parseResult.success) {
    // Unknown format → store as regular file, not profile
    return uploadStandardFile(buffer, filename, versionId, organizationId);
  }

  const { printerName, printerNameNormalized, thumbnail, slicerType, metadata } = parseResult.data;

  // 2. Check for fuzzy conflicts
  const existingProfiles = await db.query.printProfiles.findMany({
    where: eq(printProfiles.versionId, versionId),
  });

  const conflict = existingProfiles.find((p) => isConflict(p.printerName, printerName));

  if (conflict) {
    return {
      conflict: true,
      existingProfile: {
        id: conflict.id,
        printerName: conflict.printerName,
        createdAt: conflict.createdAt,
      },
      newProfile: { printerName, metadata },
      pendingBuffer: buffer,
      pendingFilename: filename,
    };
  }

  // 3. Store files and create records
  return createProfileWithFile(buffer, filename, versionId, organizationId, {
    printerName,
    printerNameNormalized,
    thumbnail,
    slicerType,
    metadata,
  });
}
```

### Batch Upload Flow

For multi-file uploads, collect all results and present summary:

```typescript
type BatchUploadResult = {
  successful: ProfileRecord[];
  conflicts: ConflictInfo[];
  failed: { filename: string; error: string }[];
};

// UI collects all conflicts, shows batch resolution dialog at end
```

### Conflict Resolution Options

```typescript
type ConflictResolution =
  | { action: "replace"; existingProfileId: string }
  | { action: "keep_both" } // Creates with auto-suffix
  | { action: "cancel" };
```

---

## Server Functions

### Location

`src/server/functions/print-profiles.ts`

### Functions

```typescript
import { createServerFn } from "@tanstack/react-start";

// List profiles for a version
export const listPrintProfiles = createServerFn({ method: "GET" })
  .validator(z.object({ versionId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Auth check...
    return db.query.printProfiles.findMany({
      where: eq(printProfiles.versionId, data.versionId),
      with: { file: true },
      orderBy: [asc(printProfiles.printerName)], // Alphabetical
    });
  });

// Delete a profile (cascades to file)
export const deletePrintProfile = createServerFn({ method: "POST" })
  .validator(z.object({ profileId: z.string().uuid() }))
  .handler(async ({ data }) => {
    // Auth check...
    // Cascade will delete the linked file too
    await db.delete(printProfiles).where(eq(printProfiles.id, data.profileId));
    return { success: true };
  });

// Replace existing profile
export const replacePrintProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      existingProfileId: z.string().uuid(),
      file: z.instanceof(File),
    }),
  )
  .handler(async ({ data }) => {
    // Auth check...
    const existing = await getProfile(data.existingProfileId);
    await deletePrintProfile({ profileId: data.existingProfileId });
    return uploadFile(data.file, existing.versionId, organizationId);
  });

// Submit unknown slicer feedback
export const submitSlicerFeedback = createServerFn({ method: "POST" })
  .validator(
    z.object({
      profileId: z.string().uuid(),
      slicerName: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    // Log to OpenPanel or internal analytics
    // Could also update profile's slicerType to a custom value
    await logEvent("unknown_slicer_feedback", {
      profileId: data.profileId,
      reportedSlicer: data.slicerName,
    });
    return { success: true };
  });
```

---

## UI Components

### Component Structure

```
src/components/model-detail/
├── version-tabs.tsx              # Tabs: Source Files | Print Profiles
├── source-files-section.tsx      # Existing file list (renamed)
├── print-profiles-section.tsx    # NEW: profiles list
├── print-profile-card.tsx        # NEW: single profile display
├── profile-upload-zone.tsx       # NEW: upload area for profiles
├── profile-conflict-dialog.tsx   # NEW: batch conflict resolution
└── unknown-slicer-form.tsx       # NEW: inline feedback form
```

### Tabs Component

```tsx
// src/components/model-detail/version-tabs.tsx

function VersionTabs({ version }: { version: ModelVersion }) {
  return (
    <Tabs defaultValue="files">
      <TabsList>
        <TabsTrigger value="files">Source Files</TabsTrigger>
        <TabsTrigger value="profiles">Print Profiles</TabsTrigger>
      </TabsList>

      <TabsContent value="files">
        <SourceFilesSection versionId={version.id} />
      </TabsContent>

      <TabsContent value="profiles">
        <PrintProfilesSection versionId={version.id} />
      </TabsContent>
    </Tabs>
  );
}
```

### Profile Card Component

Visual hierarchy: Printer + Filament → Time/Weight → Settings details

```tsx
// src/components/model-detail/print-profile-card.tsx

type PrintProfileCardProps = {
  profile: PrintProfile & { file: ModelFile };
  onDownload: () => void;
  onDelete: () => void;
};

function PrintProfileCard({ profile, onDownload, onDelete }: PrintProfileCardProps) {
  return (
    <div className="flex gap-4 p-4 border rounded-lg">
      {/* Thumbnail (if exists) */}
      {profile.thumbnailPath && (
        <img
          src={getR2Url(profile.thumbnailPath)}
          alt={`${profile.printerName} preview`}
          className="w-24 h-24 object-cover rounded"
        />
      )}

      {/* Info - text-only if no thumbnail */}
      <div className="flex-1">
        {/* Primary: Printer + Filament */}
        <h4 className="font-medium">{profile.printerName}</h4>
        {profile.metadata?.filamentSummary && (
          <p className="text-sm text-muted-foreground">{profile.metadata.filamentSummary}</p>
        )}

        {/* Secondary: Time + Weight */}
        {profile.metadata && (
          <p className="text-sm text-muted-foreground">
            {profile.metadata.printTime && formatDuration(profile.metadata.printTime)}
            {profile.metadata.filamentWeight && ` • ${profile.metadata.filamentWeight}g`}
            {profile.metadata.plateInfo && ` • ${profile.metadata.plateInfo.copiesPerPlate} copies`}
          </p>
        )}

        {/* Tertiary: Settings (collapsed by default?) */}
        {profile.metadata?.settings && (
          <p className="text-xs text-muted-foreground">
            {profile.metadata.settings.layerHeight}mm
            {profile.metadata.settings.infill && ` • ${profile.metadata.settings.infill}% infill`}
          </p>
        )}

        {/* Unknown slicer feedback form */}
        {profile.slicerType === "unknown" && <UnknownSlicerForm profileId={profile.id} />}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={onDownload}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

### Empty State

```tsx
function ProfilesEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="text-center py-12 border-2 border-dashed rounded-lg">
      <Layers className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-medium">No print profiles yet</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
        Upload 3MF files from your slicer to save print settings for different printers. Supports
        Bambu Studio, PrusaSlicer, and OrcaSlicer.
      </p>
      <Button className="mt-4" onClick={onUpload}>
        <Upload className="mr-2 h-4 w-4" />
        Add Print Profile
      </Button>
    </div>
  );
}
```

### Conflict Dialog (Batch)

```tsx
function ProfileConflictDialog({
  conflicts,
  onResolve,
}: {
  conflicts: ConflictInfo[];
  onResolve: (resolutions: Map<string, ConflictResolution>) => void;
}) {
  // Show list of conflicts
  // Each with: existing name vs new name
  // Simple message: "A profile for a similar printer already exists"
  // Options per conflict: Replace | Keep Both | Skip
  // "Resolve All" button at bottom
}
```

---

## ZIP Export Integration

Update existing version ZIP export to include profiles:

```typescript
// src/server/services/models/export.service.ts

async function exportVersionAsZip(versionId: string): Promise<Buffer> {
  const version = await getVersionWithFiles(versionId);
  const profiles = await listPrintProfiles({ versionId });

  const zip = new JSZip();

  // Add source files
  for (const file of version.files) {
    const content = await downloadFromR2(file.storageKey);
    zip.file(file.filename, content);
  }

  // Add profiles in profiles/ subdirectory
  for (const profile of profiles) {
    const content = await downloadFromR2(profile.file.storageKey);
    zip.file(`profiles/${profile.file.filename}`, content);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
```

---

## Implementation Phases

### Phase 1: Database Foundation

1. Add `printProfiles` table to Drizzle schema
2. Add `printerNameNormalized` and `slicerType` columns
3. Add relations to existing tables
4. Generate and run migration
5. Add TypeScript types

**Files:**

- `src/lib/db/schema/models.ts`
- `src/lib/db/schema/index.ts`
- `src/types/print-profiles.ts` (NEW)

### Phase 2: Parser Infrastructure

1. Create parser directory structure
2. Implement shared utilities (ZIP extraction, normalization, similarity)
3. Implement Bambu Studio parser
4. Implement OrcaSlicer parser
5. Implement PrusaSlicer parser
6. Add unit tests with fixture 3MF files

**Files:**

- `src/server/services/parsers/` (NEW directory)
- `src/server/services/parsers/*.test.ts`

**Dependencies:**

- `unzipper` or similar for ZIP reading
- String similarity library (or implement Levenshtein)

### Phase 3: Upload Integration

1. Add 3MF detection in upload flow
2. Integrate parser with upload
3. Implement conflict detection with fuzzy matching
4. Handle batch uploads
5. Add transaction handling

**Files:**

- `src/server/services/models/model-file.service.ts`

### Phase 4: Server Functions

1. `listPrintProfiles` function
2. `deletePrintProfile` function
3. `replacePrintProfile` function
4. `submitSlicerFeedback` function
5. Update ZIP export to include profiles

**Files:**

- `src/server/functions/print-profiles.ts` (NEW)
- `src/server/services/models/export.service.ts`

### Phase 5: UI Components

1. Create `version-tabs.tsx` (replace current layout)
2. Create `print-profiles-section.tsx`
3. Create `print-profile-card.tsx`
4. Create `profile-upload-zone.tsx` (multi-file)
5. Create `profile-conflict-dialog.tsx` (batch)
6. Create `unknown-slicer-form.tsx`
7. Implement empty state
8. Add simple success toast

**Files:**

- `src/components/model-detail/*.tsx`
- Update route: `src/routes/organization/$orgSlug/models/$modelSlug.tsx`

### Phase 6: Polish

1. Error handling and edge cases
2. Loading states
3. Success/error toasts
4. Analytics logging for unknown formats

---

## Testing

### Unit Tests (Parser Only)

```typescript
// src/server/services/parsers/bambu-parser.test.ts

describe("bambu-parser", () => {
  it("extracts printer name from Bambu 3MF", async () => {
    const buffer = await readFile("fixtures/bambu-x1c.3mf");
    const result = await parse3MFFromBuffer(buffer);

    expect(result.success).toBe(true);
    expect(result.data.printerName).toBe("Bambu Lab X1 Carbon");
    expect(result.data.slicerType).toBe("bambu");
  });

  it("extracts thumbnail", async () => {
    const buffer = await readFile("fixtures/bambu-x1c.3mf");
    const result = await parse3MFFromBuffer(buffer);

    expect(result.data.thumbnail).toBeInstanceOf(Buffer);
  });

  it("handles multi-material as summary string", async () => {
    const buffer = await readFile("fixtures/bambu-multicolor.3mf");
    const result = await parse3MFFromBuffer(buffer);

    expect(result.data.metadata.filamentSummary).toMatch(/PLA.*PLA/);
  });
});

// src/server/services/parsers/prusa-parser.test.ts
describe("prusa-parser", () => {
  it("extracts from PrusaSlicer 3MF", async () => {
    const buffer = await readFile("fixtures/prusa-mk4.3mf");
    const result = await parse3MFFromBuffer(buffer);

    expect(result.success).toBe(true);
    expect(result.data.slicerType).toBe("prusa");
  });

  it("handles missing thumbnail gracefully", async () => {
    const buffer = await readFile("fixtures/prusa-no-thumb.3mf");
    const result = await parse3MFFromBuffer(buffer);

    expect(result.success).toBe(true);
    expect(result.data.thumbnail).toBeNull();
  });
});

// src/server/services/parsers/utils.test.ts
describe("normalization", () => {
  it("normalizes printer names correctly", () => {
    expect(normalizePrinterName("X1 Carbon")).toBe("x1carbon");
    expect(normalizePrinterName("Bambu Lab X1C")).toBe("bambulabx1c");
  });

  it("detects conflicts at 80% threshold", () => {
    expect(isConflict("X1 Carbon", "X1C")).toBe(true);
    expect(isConflict("X1 Carbon", "A1 Mini")).toBe(false);
  });
});
```

### Manual Testing Checklist

- [ ] Upload Bambu X1C 3MF → profile created with correct metadata
- [ ] Upload Bambu A1 Mini 3MF → second profile created
- [ ] Upload PrusaSlicer 3MF → profile created, slicer type = "prusa"
- [ ] Upload OrcaSlicer 3MF → profile created, slicer type = "orca"
- [ ] Upload unknown slicer 3MF → stored as regular file, not profile
- [ ] Thumbnail displays correctly when present
- [ ] No thumbnail → text-only card displays correctly
- [ ] Print time, filament summary displayed correctly
- [ ] Multi-file upload → all processed, conflicts collected
- [ ] Upload duplicate X1C 3MF → conflict dialog appears
- [ ] Fuzzy match: "X1 Carbon" vs "X1C Production" → conflict detected
- [ ] Choose "Replace" → old profile deleted, new created
- [ ] Choose "Keep Both" → both profiles exist (suffix added)
- [ ] Delete profile → file and record removed
- [ ] Download profile → original 3MF downloaded
- [ ] ZIP export includes profiles in `profiles/` folder
- [ ] Unknown slicer → feedback form appears, can submit
- [ ] Empty state shows explanatory text + upload button
- [ ] Simple toast on successful upload

---

## Future Considerations (Out of Scope for v1)

- **API endpoints** for external access
- **PrintPulse integration**: Link `printerName` to actual printer inventory
- **Cross-model queries**: "What can I print on X1C?"
- **Profile templates**: Copy profiles between versions
- **Additional slicers**: Cura, SuperSlicer, etc.
- **Profile comparison**: Side-by-side settings diff
- **Canonical printer registry**: User-defined printer fleet mapping

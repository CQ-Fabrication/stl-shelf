import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user as authUser, organization } from "./auth";

export const models = pgTable(
  "models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => authUser.id), // Keep for audit trail
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    currentVersion: text("current_version").notNull().default("v1"),
    totalVersions: integer("total_versions").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("models_org_slug_idx").on(table.organizationId, table.slug),
    index("models_name_idx").on(table.name),
    index("models_updated_at_idx").on(table.updatedAt),
    index("models_owner_idx").on(table.ownerId),
    index("models_org_idx").on(table.organizationId),
    index("models_deleted_at_idx").on(table.deletedAt),
  ],
);

export const modelVersions = pgTable(
  "model_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    thumbnailPath: text("thumbnail_path"),
    printSettings: jsonb("print_settings").$type<{
      material?: string;
      layerHeight?: number;
      infill?: number;
      printTime?: number;
      weight?: number;
      supports?: boolean;
      raftBrim?: "none" | "raft" | "brim";
      temperature?: {
        nozzle?: number;
        bed?: number;
      };
      speed?: {
        print?: number;
        travel?: number;
        firstLayer?: number;
      };
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("model_versions_model_version_idx").on(table.modelId, table.version),
    index("model_versions_model_id_idx").on(table.modelId),
    index("model_versions_version_idx").on(table.version),
  ],
);

export const modelFiles = pgTable(
  "model_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => modelVersions.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    size: integer("size").notNull(),
    mimeType: text("mime_type").notNull(),
    extension: text("extension").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    storageUrl: text("storage_url"),
    storageBucket: text("storage_bucket").notNull(),
    fileMetadata: jsonb("file_metadata").$type<{
      boundingBox?: {
        width: number;
        height: number;
        depth: number;
        volume?: number;
      };
      triangleCount?: number;
      vertexCount?: number;
      isClosed?: boolean;
      isManifold?: boolean;
      estimatedVolume?: number;
      estimatedWeight?: number;
      units?: "mm" | "in" | "cm";
      threeMfMetadata?: {
        application?: string;
        version?: string;
        materials?: Array<{
          id: string;
          name: string;
          color?: string;
        }>;
        printSettings?: {
          layerHeight?: number;
          infill?: number;
          supports?: boolean;
        };
      };
      processed: boolean;
      processedAt?: string;
      processingErrors?: string[];
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("model_files_version_id_idx").on(table.versionId),
    uniqueIndex("model_files_storage_key_idx").on(table.storageKey),
    index("model_files_filename_idx").on(table.filename),
    index("model_files_extension_idx").on(table.extension),
  ],
);

export const tagTypes = pgTable(
  "tag_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    description: text("description"),
  },
  (table) => [uniqueIndex("tag_types_name_idx").on(table.name)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    typeId: uuid("type_id").references(() => tagTypes.id),
    color: text("color"),
    description: text("description"),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tags_org_name_idx").on(table.organizationId, table.name),
    index("tags_org_idx").on(table.organizationId),
    index("tags_type_idx").on(table.typeId),
    index("tags_usage_count_idx").on(table.usageCount),
    index("tags_org_type_name_idx").on(table.organizationId, table.typeId, table.name),
  ],
);

export const modelTags = pgTable(
  "model_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("model_tags_model_tag_idx").on(table.modelId, table.tagId),
    index("model_tags_model_id_idx").on(table.modelId),
    index("model_tags_tag_id_idx").on(table.tagId),
  ],
);

export const versionTags = pgTable(
  "version_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => modelVersions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("version_tags_version_tag_idx").on(table.versionId, table.tagId),
    index("version_tags_version_id_idx").on(table.versionId),
    index("version_tags_tag_id_idx").on(table.tagId),
  ],
);

// Relations
export const modelsRelations = relations(models, ({ many, one }) => ({
  versions: many(modelVersions),
  tags: many(modelTags),
  currentVersionData: one(modelVersions, {
    fields: [models.currentVersion],
    references: [modelVersions.version],
  }),
}));

export const modelVersionsRelations = relations(modelVersions, ({ many, one }) => ({
  model: one(models, {
    fields: [modelVersions.modelId],
    references: [models.id],
  }),
  files: many(modelFiles),
  tags: many(versionTags),
}));

export const modelFilesRelations = relations(modelFiles, ({ one }) => ({
  version: one(modelVersions, {
    fields: [modelFiles.versionId],
    references: [modelVersions.id],
  }),
}));

export const tagTypesRelations = relations(tagTypes, ({ many }) => ({
  tags: many(tags),
}));

export const tagsRelations = relations(tags, ({ many, one }) => ({
  type: one(tagTypes, {
    fields: [tags.typeId],
    references: [tagTypes.id],
  }),
  models: many(modelTags),
  versions: many(versionTags),
}));

export const modelTagsRelations = relations(modelTags, ({ one }) => ({
  model: one(models, {
    fields: [modelTags.modelId],
    references: [models.id],
  }),
  tag: one(tags, {
    fields: [modelTags.tagId],
    references: [tags.id],
  }),
}));

export const versionTagsRelations = relations(versionTags, ({ one }) => ({
  version: one(modelVersions, {
    fields: [versionTags.versionId],
    references: [modelVersions.id],
  }),
  tag: one(tags, {
    fields: [versionTags.tagId],
    references: [tags.id],
  }),
}));

import { createFileRoute } from "@tanstack/react-router";
import { db, models, modelVersions, modelFiles } from "@/lib/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { formatBytes, getFileSizeLimit, MIME_TYPES, MODEL_EXTENSIONS } from "@/lib/files/limits";
import { validateApiKey, hasScope } from "@/server/middleware/api-key";
import { storageService } from "@/server/services/storage";

const ALLOWED_EXTENSIONS = new Set<string>(MODEL_EXTENSIONS);

export const Route = createFileRoute("/api/v1/upload")({
  server: {
    handlers: {
      /**
       * Upload a file to an existing model version or create a new version
       *
       * Form data:
       * - file: The file to upload
       * - modelId: Target model ID
       * - version: Version number (optional, creates new version if not specified)
       * - versionName: Version name (optional, for new versions)
       * - description: Version description (optional, for new versions)
       */
      POST: async ({ request }: { request: Request }) => {
        const validation = await validateApiKey(request);
        if (!validation.valid) {
          return Response.json({ error: validation.error }, { status: validation.status });
        }

        // Check scope
        if (
          !hasScope(validation.scopes, "upload") &&
          !hasScope(validation.scopes, "write") &&
          !hasScope(validation.scopes, "*")
        ) {
          return Response.json(
            { error: "Insufficient permissions. Required scope: upload or write" },
            { status: 403 },
          );
        }

        try {
          const formData = await request.formData();
          const file = formData.get("file") as File | null;
          const modelId = formData.get("modelId") as string | null;
          const versionParam = formData.get("version") as string | null;
          const versionName = (formData.get("versionName") as string | null) || "New Version";
          const description = (formData.get("description") as string | null) || undefined;

          // Validate required fields
          if (!file) {
            return Response.json({ error: "Missing required field: file" }, { status: 400 });
          }

          if (!modelId) {
            return Response.json({ error: "Missing required field: modelId" }, { status: 400 });
          }

          // Validate file extension first
          const extension = file.name.split(".").pop()?.toLowerCase() || "";
          if (!ALLOWED_EXTENSIONS.has(extension)) {
            return Response.json(
              {
                error: `Invalid file type. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
              },
              { status: 400 },
            );
          }

          // Validate file size per extension
          const maxSize = getFileSizeLimit(extension);
          if (file.size > maxSize) {
            return Response.json(
              {
                error: `File too large. ${formatBytes(file.size)} exceeds the ${formatBytes(maxSize)} limit for .${extension} files`,
              },
              { status: 400 },
            );
          }

          // Verify model belongs to organization
          const [model] = await db
            .select({
              id: models.id,
              currentVersion: models.currentVersion,
              totalVersions: models.totalVersions,
            })
            .from(models)
            .where(
              and(
                eq(models.id, modelId),
                eq(models.organizationId, validation.organizationId),
                isNull(models.deletedAt),
              ),
            )
            .limit(1);

          if (!model) {
            return Response.json({ error: "Model not found" }, { status: 404 });
          }

          let versionId: string;
          let versionNumber: string;

          if (versionParam) {
            // Upload to existing version
            const [existingVersion] = await db
              .select({ id: modelVersions.id, version: modelVersions.version })
              .from(modelVersions)
              .where(
                and(eq(modelVersions.modelId, modelId), eq(modelVersions.version, versionParam)),
              )
              .limit(1);

            if (!existingVersion) {
              return Response.json({ error: `Version ${versionParam} not found` }, { status: 404 });
            }

            versionId = existingVersion.id;
            versionNumber = existingVersion.version;
          } else {
            // Create new version
            versionNumber = `v${model.totalVersions + 1}`;
            versionId = crypto.randomUUID();
          }

          // Generate storage key and upload file
          const storageKey = storageService.generateStorageKey({
            organizationId: validation.organizationId,
            modelId,
            version: versionNumber,
            filename: file.name,
            kind: "source",
          });

          await storageService.uploadFile({
            key: storageKey,
            file,
            contentType: file.type || MIME_TYPES[extension] || "application/octet-stream",
          });

          const fileId = crypto.randomUUID();
          const mimeType = file.type || MIME_TYPES[extension] || "application/octet-stream";

          try {
            await db.transaction(async (tx) => {
              if (!versionParam) {
                await tx.insert(modelVersions).values({
                  id: versionId,
                  modelId,
                  version: versionNumber,
                  name: versionName,
                  description,
                });

                await tx
                  .update(models)
                  .set({
                    currentVersion: versionNumber,
                    totalVersions: sql`${models.totalVersions} + 1`,
                    updatedAt: new Date(),
                  })
                  .where(eq(models.id, modelId));
              }

              await tx.insert(modelFiles).values({
                id: fileId,
                versionId,
                filename: file.name,
                originalName: file.name,
                size: file.size,
                mimeType,
                extension,
                storageKey,
                storageBucket: storageService.defaultBucket,
              });
            });
          } catch (error) {
            await storageService.deleteFile(storageKey).catch(() => {});
            throw error;
          }

          return Response.json({
            success: true,
            file: {
              id: fileId,
              filename: file.name,
              extension,
              size: file.size,
              storageKey,
            },
            version: {
              id: versionId,
              version: versionNumber,
            },
            model: {
              id: modelId,
            },
          });
        } catch (error) {
          console.error("API v1 upload error:", error);
          return Response.json({ error: "Internal server error" }, { status: 500 });
        }
      },
    },
  },
});

import { createFileRoute } from '@tanstack/react-router'
import { db, models, modelVersions, modelFiles } from '@/lib/db'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { validateApiKey } from '@/server/middleware/api-key'

export const Route = createFileRoute('/api/v1/models/$modelId/versions')({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request
        params: { modelId: string }
      }) => {
        const validation = await validateApiKey(request)
        if (!validation.valid) {
          return Response.json(
            { error: validation.error },
            { status: validation.status }
          )
        }

        try {
          const { modelId } = params

          // Verify model belongs to organization
          const [model] = await db
            .select({ id: models.id })
            .from(models)
            .where(
              and(
                eq(models.id, modelId),
                eq(models.organizationId, validation.organizationId),
                isNull(models.deletedAt)
              )
            )
            .limit(1)

          if (!model) {
            return Response.json({ error: 'Model not found' }, { status: 404 })
          }

          // Get all versions
          const versions = await db
            .select({
              id: modelVersions.id,
              version: modelVersions.version,
              name: modelVersions.name,
              description: modelVersions.description,
              createdAt: modelVersions.createdAt,
            })
            .from(modelVersions)
            .where(eq(modelVersions.modelId, modelId))
            .orderBy(desc(modelVersions.createdAt))

          // Get files for each version
          const versionsWithFiles = await Promise.all(
            versions.map(async (version) => {
              const files = await db
                .select({
                  id: modelFiles.id,
                  filename: modelFiles.filename,
                  extension: modelFiles.extension,
                  size: modelFiles.size,
                  mimeType: modelFiles.mimeType,
                  createdAt: modelFiles.createdAt,
                })
                .from(modelFiles)
                .where(eq(modelFiles.versionId, version.id))
                .orderBy(modelFiles.filename)

              return {
                ...version,
                files,
              }
            })
          )

          return Response.json({
            modelId,
            versions: versionsWithFiles,
          })
        } catch (error) {
          console.error('API v1 model versions error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
          )
        }
      },
    },
  },
})

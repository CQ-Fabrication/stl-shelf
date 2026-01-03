import archiver from 'archiver'
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'
import { modelDownloadService } from '@/server/services/models/model-download.service'

export const Route = createFileRoute('/api/download/version/$versionId/zip')({
  server: {
    handlers: {
      GET: async ({
        request,
        params,
      }: {
        request: Request
        params: { versionId: string }
      }) => {
        // 1. Auth check using request headers
        const session = await auth.api.getSession({
          headers: request.headers,
        })

        if (!session?.session?.activeOrganizationId) {
          return new Response('Unauthorized', { status: 401 })
        }

        const { versionId } = params
        const organizationId = session.session.activeOrganizationId

        // 2. Get version info and validate access
        const versionInfo = await modelDownloadService.getVersionInfo(
          versionId,
          organizationId
        )

        if (!versionInfo) {
          return new Response('Not found', { status: 404 })
        }

        if (versionInfo.files.length === 0) {
          return new Response('No files in this version', { status: 404 })
        }

        // 3. Create streaming response via TransformStream
        const { readable, writable } = new TransformStream<Uint8Array>()
        const writer = writable.getWriter()

        // 4. Create archiver with moderate compression (balance speed/size)
        const archive = archiver('zip', { zlib: { level: 6 } })

        // Pipe archiver output to the TransformStream writer
        archive.on('data', (chunk: Buffer) => {
          writer.write(new Uint8Array(chunk))
        })

        archive.on('end', () => {
          writer.close()
        })

        archive.on('error', (err) => {
          console.error('Archive error:', err)
          writer.abort(err)
        })

        // 5. Stream files from R2 into archive (non-blocking)
        modelDownloadService
          .streamFilesToArchive(archive, versionInfo.files)
          .then(() => archive.finalize())
          .catch((err) => {
            console.error('Stream error:', err)
            archive.abort()
          })

        // 6. Return streaming response with download headers
        const filename = `${versionInfo.modelSlug}-v${versionInfo.versionNumber}.zip`

        return new Response(readable, {
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      },
    },
  },
})

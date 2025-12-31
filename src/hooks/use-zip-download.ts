import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ModelFile } from '@/lib/model-files'
import { downloadFile, downloadVersionZip } from '@/server/functions/models'
import { triggerDownload } from '@/utils/download'

type UseZipDownloadParams = {
  modelId: string
  modelName: string
  activeVersion: { id: string } | undefined
  modelFiles: ModelFile[] | undefined
}

type UseZipDownloadResult = {
  handleDownloadZip: () => Promise<void>
  isDownloading: boolean
}

export const useZipDownload = ({
  modelId,
  modelName,
  activeVersion,
  modelFiles,
}: UseZipDownloadParams): UseZipDownloadResult => {
  const downloadZipMutation = useMutation({
    mutationFn: async ({
      modelId,
      versionId,
    }: {
      modelId: string
      versionId: string
    }) => {
      // Get files metadata from server
      const { files } = await downloadVersionZip({ data: { modelId, versionId } })

      if (!files || files.length === 0) {
        throw new Error('No files to download')
      }

      // Dynamic import JSZip only when needed
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // Download each file and add to zip
      for (const file of files) {
        const downloadInfo = await downloadFile({ data: { storageKey: file.storageKey } })

        if (downloadInfo.downloadUrl) {
          const response = await fetch(downloadInfo.downloadUrl)
          if (!response.ok) {
            console.error(`Failed to download file: ${file.originalName}`)
            continue
          }
          const blob = await response.blob()
          zip.file(file.originalName, blob)
        }
      }

      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      return zipBlob
    },
  })

  const handleDownloadZip = async () => {
    if (!activeVersion?.id) {
      toast.error('No version selected')
      return
    }

    if (!modelFiles || modelFiles.length === 0) {
      toast.error('No files available to download')
      return
    }

    try {
      toast.info('Preparing ZIP download...')

      const blob = await downloadZipMutation.mutateAsync({
        modelId,
        versionId: activeVersion.id,
      })

      triggerDownload(blob, `${modelName}.zip`)

      toast.success('Download started')
    } catch (error) {
      toast.error('Failed to download files')
      console.error(error)
    }
  }

  return {
    handleDownloadZip,
    isDownloading: downloadZipMutation.isPending,
  }
}

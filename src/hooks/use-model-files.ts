import { skipToken, useQuery } from '@tanstack/react-query'
import { filterModelFiles, type ModelFile } from '@/lib/model-files'
import { getModelFiles, getModelVersions } from '@/server/functions/models'

type UseModelFilesParams = {
  modelId: string
  versionId?: string
}

type UseModelFilesResult = {
  files: ModelFile[] | undefined
  modelFiles: ModelFile[] | undefined
  versions: Array<{ id: string }> | undefined
  activeVersion: { id: string } | undefined
  isLoading: boolean
  error: Error | null
}

export const useModelFiles = ({
  modelId,
  versionId,
}: UseModelFilesParams): UseModelFilesResult => {
  // Fetch model versions
  const { data: versions } = useQuery({
    queryKey: ['models', modelId, 'versions'],
    queryFn: () => getModelVersions({ data: { modelId } }),
  })

  const activeVersion = versionId
    ? versions?.find((v) => v.id === versionId)
    : versions?.[0]

  // Determine the versionId to use for files query
  const effectiveVersionId = versionId || versions?.[0]?.id

  // Fetch files
  const filesQuery = useQuery({
    queryKey: ['models', modelId, 'versions', effectiveVersionId, 'files'],
    queryFn: effectiveVersionId
      ? () => getModelFiles({ data: { modelId, versionId: effectiveVersionId } })
      : skipToken,
    enabled: Boolean(effectiveVersionId),
  })

  const files = filesQuery.data as ModelFile[] | undefined
  const modelFiles = files ? filterModelFiles(files) : undefined

  return {
    files,
    modelFiles,
    versions,
    activeVersion,
    isLoading: filesQuery.isLoading,
    error: filesQuery.error,
  }
}

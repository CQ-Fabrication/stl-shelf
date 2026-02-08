import { skipToken, useQuery } from "@tanstack/react-query";
import { filterModelFiles, type ModelFile } from "@/lib/model-files";
import { getModelFiles, getModelVersions } from "@/server/functions/models";

type UseModelFilesParams = {
  modelId: string;
  versionId?: string;
};

type ModelVersion = {
  id: string;
  version: string;
  name: string;
  description: string | null;
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  files: ModelFile[];
  createdAt: string;
  updatedAt: string;
};

type UseModelFilesResult = {
  files: ModelFile[] | undefined;
  modelFiles: ModelFile[] | undefined;
  versions: ModelVersion[] | undefined;
  activeVersion: ModelVersion | undefined;
  isLoading: boolean;
  error: Error | null;
};

export const useModelFiles = ({ modelId, versionId }: UseModelFilesParams): UseModelFilesResult => {
  // Fetch model versions
  const { data: versions } = useQuery({
    queryKey: ["model", modelId, "versions"],
    queryFn: () => getModelVersions({ data: { modelId } }),
  });

  const activeVersion = versionId ? versions?.find((v) => v.id === versionId) : versions?.[0];

  // Determine the versionId to use for files query
  const effectiveVersionId = versionId || versions?.[0]?.id;

  // Fetch files
  const filesQuery = useQuery({
    queryKey: ["model", modelId, "files", effectiveVersionId],
    queryFn: effectiveVersionId
      ? () => getModelFiles({ data: { modelId, versionId: effectiveVersionId } })
      : skipToken,
    enabled: Boolean(effectiveVersionId),
  });

  const files = filesQuery.data as ModelFile[] | undefined;
  const modelFiles = files ? filterModelFiles(files) : undefined;

  return {
    files,
    modelFiles,
    versions,
    activeVersion,
    isLoading: filesQuery.isLoading,
    error: filesQuery.error,
  };
};

import { skipToken, useQuery } from "@tanstack/react-query";
import { filterModelFiles, type ModelFile } from "@/lib/slicers/utils";
import { orpc } from "@/utils/orpc";

type UseModelFilesParams = {
  modelId: string;
  versionId?: string;
};

type UseModelFilesResult = {
  files: ModelFile[] | undefined;
  modelFiles: ModelFile[] | undefined;
  versions: Array<{ id: string }> | undefined;
  activeVersion: { id: string } | undefined;
  isLoading: boolean;
  error: Error | null;
};

export const useModelFiles = ({
  modelId,
  versionId,
}: UseModelFilesParams): UseModelFilesResult => {
  // Fetch model versions
  const { data: versions } = useQuery(
    orpc.models.getModelVersions.queryOptions({ input: { modelId } })
  );

  const activeVersion = versionId
    ? versions?.find((v) => v.id === versionId)
    : versions?.[0];

  // Construct query options
  const getQueryOptions = () => {
    if (versionId) {
      return { input: { modelId, versionId } };
    }
    if (versions?.[0]?.id) {
      return { input: { modelId, versionId: versions[0].id } };
    }
    return skipToken;
  };

  const queryOptions = getQueryOptions();

  // Fetch files
  const filesQuery = useQuery(
    queryOptions === skipToken
      ? { queryKey: ["skip"], queryFn: skipToken }
      : orpc.models.getModelFiles.queryOptions(queryOptions)
  );

  const files = filesQuery.data;
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

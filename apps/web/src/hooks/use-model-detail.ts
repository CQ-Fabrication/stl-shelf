import { useQuery } from '@tanstack/react-query';
import { orpc } from '@/utils/orpc';
import type { Model, ModelFile } from '../../../server/src/types/model';

export const useModelDetail = (modelId: string) => {
  const modelQuery = useQuery(
    orpc.getModel.queryOptions({
      input: { id: modelId },
    })
  );

  // Git history not implemented yet - removed to improve performance
  // const historyQuery = useQuery(
  //   orpc.getModelHistory.queryOptions({
  //     input: { modelId, limit: 5 },
  //   })
  // );

  const model = modelQuery.data;
  const latestVersion = model?.versions[0];

  const totalSize =
    latestVersion?.files.reduce((sum, file) => sum + file.size, 0) ?? 0;

  return {
    model,
    latestVersion,
    totalSize,
    history: [], // historyQuery.data,
    isLoading: modelQuery.isLoading,
    error: modelQuery.error,
  };
};

export const findMainModelFile = (
  files: ModelFile[]
): ModelFile | undefined => {
  return files.find((f) =>
    ['.stl', '.obj', '.3mf', '.ply'].includes(f.extension.toLowerCase())
  );
};

export const calculateTotalSize = (files: ModelFile[]): number => {
  return files.reduce((sum, file) => sum + file.size, 0);
};

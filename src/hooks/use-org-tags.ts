import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { MODELS_QUERY_KEY } from "@/hooks/use-delete-model";
import {
  createTag,
  deleteTag,
  getOrgTags,
  mergeTags,
  renameTag,
  updateTagColor,
} from "@/server/functions/tags";

export const ORG_TAGS_QUERY_KEY = ["org-tags"] as const;

export type OrgTag = Awaited<ReturnType<typeof getOrgTags>>[number];

/**
 * Org-wide tag mutations reshape the shared taxonomy, so every model and tag
 * cache can go stale at once. Rather than surgically patch each entry (as the
 * per-model tag-editor does), we invalidate the affected families and let
 * active observers refetch. Inactive caches (e.g. a model-detail view) are
 * marked stale and refresh on next visit.
 */
function invalidateTagCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ORG_TAGS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["tags", "all"] });
  queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: ["model"] });
}

export function useOrgTags() {
  return useQuery({
    queryKey: ORG_TAGS_QUERY_KEY,
    queryFn: () => getOrgTags(),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color?: string }) => createTag({ data: input }),
    onSuccess: () => invalidateTagCaches(queryClient),
  });
}

export function useRenameTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tagId: string; newName: string }) => renameTag({ data: input }),
    onSuccess: () => invalidateTagCaches(queryClient),
  });
}

export function useMergeTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { sourceTagId: string; targetTagId: string }) => mergeTags({ data: input }),
    onSuccess: () => invalidateTagCaches(queryClient),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tagId: string }) => deleteTag({ data: input }),
    onSuccess: () => invalidateTagCaches(queryClient),
  });
}

export function useUpdateTagColor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tagId: string; color: string }) => updateTagColor({ data: input }),
    onSuccess: () => invalidateTagCaches(queryClient),
  });
}

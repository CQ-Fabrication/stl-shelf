import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { errorContextActions } from "@/stores/error-context.store";
import { ChangelogSheet } from "@/components/model-detail/changelog-sheet";
import { ModelDetailHeader } from "@/components/model-detail/model-detail-header";
import { ModelInfoCard } from "@/components/model-detail/model-info-card";
import { ModelPreviewCard } from "@/components/model-detail/model-preview-card";
import { ModelVersionHistory } from "@/components/model-detail/model-version-history";
import { VersionUploadModal } from "@/components/model-detail/version-upload-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteModel } from "@/hooks/use-delete-model";
import { addVersion, getModel, getModelVersions } from "@/server/functions/models";

export const Route = createFileRoute("/models/$modelId")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: ModelDetailComponent,
});

function ModelDetailComponent() {
  const { modelId } = Route.useParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionUploadModalOpen, setVersionUploadModalOpen] = useState(false);
  const [changelogSheetOpen, setChangelogSheetOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();

  // Track action for error context
  useEffect(() => {
    errorContextActions.setLastAction({
      type: "view_model",
      modelId,
      versionId: selectedVersionId ?? null,
    });
  }, [modelId, selectedVersionId]);

  const queryClient = useQueryClient();
  const deleteModel = useDeleteModel();
  const { data: model } = useQuery({
    queryKey: ["models", modelId],
    queryFn: () => getModel({ data: { id: modelId } }),
  });
  const { data: versions } = useQuery({
    queryKey: ["models", modelId, "versions"],
    queryFn: () => getModelVersions({ data: { modelId } }),
  });

  const addVersionMutation = useMutation({
    mutationFn: async (formInput: { changelog: string; files: File[]; previewImage?: File }) => {
      const formData = new FormData();
      formData.append("modelId", modelId);
      formData.append("changelog", formInput.changelog);
      for (const file of formInput.files) {
        formData.append("files", file);
      }
      if (formInput.previewImage) {
        formData.append("previewImage", formInput.previewImage);
      }
      return addVersion({ data: formData });
    },
    onSuccess: (data) => {
      toast.success("Version uploaded successfully", {
        description: `Created ${data.version} with ${data.files.length} file${data.files.length > 1 ? "s" : ""}`,
      });
      queryClient.invalidateQueries({
        queryKey: ["models", modelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["models", modelId, "versions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["billing", "usage"],
      });
      setVersionUploadModalOpen(false);
      setSelectedVersionId(data.versionId);
    },
    onError: (error) => {
      console.error("Version upload error:", error);
      toast.error("Failed to upload version. Please try again.");
    },
  });

  const activeVersion = selectedVersionId || versions?.[0]?.id;

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(versionId);
  };

  const handleDelete = () => {
    if (model) {
      deleteModel.mutate(model.id);
    }
  };

  const handleVersionUpload = (data: { changelog: string; files: File[]; previewImage?: File }) => {
    addVersionMutation.mutate(data);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <ModelDetailHeader
        activeVersion={activeVersion}
        modelId={modelId}
        onChangelogClick={() => setChangelogSheetOpen(true)}
        onDeleteClick={() => setDeleteDialogOpen(true)}
        onUploadVersionClick={() => setVersionUploadModalOpen(true)}
      />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* 3D Viewer */}
          <ModelPreviewCard modelId={modelId} versionId={activeVersion} />
          {/* Version History */}
          <ModelVersionHistory
            activeVersion={activeVersion}
            modelId={modelId}
            onVersionSelect={handleVersionSelect}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Model Info */}
          <ModelInfoCard modelId={modelId} versionId={activeVersion} />
        </div>
      </div>

      {/* Version Upload Modal */}
      <VersionUploadModal
        isOpen={versionUploadModalOpen}
        isSubmitting={addVersionMutation.isPending}
        modelId={modelId}
        onClose={() => setVersionUploadModalOpen(false)}
        onSubmit={handleVersionUpload}
      />

      {/* Changelog Sheet */}
      <ChangelogSheet
        activeVersionId={activeVersion}
        isOpen={changelogSheetOpen}
        modelId={modelId}
        onClose={() => setChangelogSheetOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{model?.name}"? This action can be undone by
              contacting support.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

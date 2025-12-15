import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@stl-shelf/ui/components/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChangelogSheet } from "@/components/model-detail/changelog-sheet";
import { ModelDetailHeader } from "@/components/model-detail/model-detail-header";
import { ModelInfoCard } from "@/components/model-detail/model-info-card";
import { ModelPreviewCard } from "@/components/model-detail/model-preview-card";
import { ModelVersionHistory } from "@/components/model-detail/model-version-history";
import { VersionUploadModal } from "@/components/model-detail/version-upload-modal";
import { useDeleteModel } from "@/hooks/use-delete-model";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/models/$modelId")({
  component: ModelDetailComponent,
});

function ModelDetailComponent() {
  const { modelId } = Route.useParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionUploadModalOpen, setVersionUploadModalOpen] = useState(false);
  const [changelogSheetOpen, setChangelogSheetOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();

  const queryClient = useQueryClient();
  const deleteModel = useDeleteModel();
  const { data: model } = useQuery(
    orpc.models.getModel.queryOptions({ input: { id: modelId } })
  );
  const { data: versions } = useQuery(
    orpc.models.getModelVersions.queryOptions({ input: { modelId } })
  );

  const addVersionMutation = useMutation(
    orpc.models.addVersion.mutationOptions({
      onSuccess: (data) => {
        toast.success("Version uploaded successfully", {
          description: `Created ${data.version} with ${data.files.length} file${data.files.length > 1 ? "s" : ""}`,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.models.getModel.key({ input: { id: modelId } }),
        });
        queryClient.invalidateQueries({
          queryKey: orpc.models.getModelVersions.key({ input: { modelId } }),
        });
        setVersionUploadModalOpen(false);
        setSelectedVersionId(data.versionId);
      },
      onError: (error) => {
        console.error("Version upload error:", error);
        toast.error("Failed to upload version. Please try again.");
      },
    })
  );

  const activeVersion = selectedVersionId || versions?.[0]?.id;

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersionId(versionId);
  };

  const handleDelete = () => {
    if (model) {
      deleteModel.mutate({ id: model.id });
    }
  };

  const handleVersionUpload = (data: { changelog: string; files: File[] }) => {
    addVersionMutation.mutate({
      modelId,
      changelog: data.changelog,
      files: data.files,
    });
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
              Are you sure you want to delete "{model?.name}"? This action can
              be undone by contacting support.
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

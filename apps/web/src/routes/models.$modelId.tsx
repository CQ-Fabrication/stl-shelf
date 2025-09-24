import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ModelDetailHeader } from "@/components/model-detail/model-detail-header";
import { ModelInfoCard } from "@/components/model-detail/model-info-card";
import { ModelPreviewCard } from "@/components/model-detail/model-preview-card";
import { ModelVersionHistory } from "@/components/model-detail/model-version-history";
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
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/models/$modelId")({
  component: ModelDetailComponent,
});

function ModelDetailComponent() {
  const { modelId } = Route.useParams();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string>();

  const deleteModel = useDeleteModel();
  const { data: model } = useQuery(
    orpc.models.getModel.queryOptions({ input: { id: modelId } })
  );
  const { data: versions } = useQuery(
    orpc.models.getModelVersions.queryOptions({ input: { modelId } })
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

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <ModelDetailHeader
        modelId={modelId}
        onDeleteClick={() => setDeleteDialogOpen(true)}
      />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* 3D Viewer */}
          <ModelPreviewCard modelId={modelId} versionId={activeVersion} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Model Info */}
          <ModelInfoCard modelId={modelId} versionId={activeVersion} />
          {/* Version History */}
          <ModelVersionHistory
            activeVersion={activeVersion}
            modelId={modelId}
            onVersionSelect={handleVersionSelect}
          />
        </div>
      </div>

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

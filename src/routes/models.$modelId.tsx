import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { errorContextActions } from "@/stores/error-context.store";
import { ModelDetailHeader } from "@/components/model-detail/model-detail-header";
import { ModelFilesPanel } from "@/components/model-detail/model-files-panel";
import { ModelInfoCard } from "@/components/model-detail/model-info-card";
import { ModelPreviewCard } from "@/components/model-detail/model-preview-card";
import { ModelVersionHistory } from "@/components/model-detail/model-version-history";
import { PrintProfilesSection } from "@/components/model-detail/print-profiles";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [selectedVersionId, setSelectedVersionId] = useState<string>();
  const [activeTab, setActiveTab] = useState<"overview" | "files" | "versions" | "profiles">(
    "overview",
  );

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
    queryKey: ["model", modelId],
    queryFn: () => getModel({ data: { id: modelId } }),
  });
  const { data: versions } = useQuery({
    queryKey: ["model", modelId, "versions"],
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
        queryKey: ["model", modelId],
      });
      queryClient.invalidateQueries({
        queryKey: ["model", modelId, "versions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["models"],
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
    <div className="bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <ModelDetailHeader
          activeVersion={activeVersion}
          modelId={modelId}
          onDeleteClick={() => setDeleteDialogOpen(true)}
          onUploadVersionClick={() => setVersionUploadModalOpen(true)}
        />

        <Tabs
          className="mt-6"
          onValueChange={(value) =>
            setActiveTab(value as "overview" | "files" | "versions" | "profiles")
          }
          value={activeTab}
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="profiles">Print Profiles</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <ModelPreviewCard modelId={modelId} versionId={activeVersion} />
              <ModelInfoCard modelId={modelId} versionId={activeVersion} />
            </div>
          </TabsContent>

          <TabsContent value="files">
            <ModelFilesPanel modelId={modelId} versionId={activeVersion} />
          </TabsContent>

          <TabsContent value="versions">
            <ModelVersionHistory
              activeVersion={activeVersion}
              modelId={modelId}
              onVersionSelect={handleVersionSelect}
            />
          </TabsContent>

          <TabsContent value="profiles">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="border-border/60 border-b">
                <CardTitle className="text-base font-semibold">Print Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                {activeVersion ? (
                  <PrintProfilesSection versionId={activeVersion} />
                ) : (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    Upload a version to add print profiles.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Version Upload Modal */}
      <VersionUploadModal
        isOpen={versionUploadModalOpen}
        isSubmitting={addVersionMutation.isPending}
        modelId={modelId}
        onClose={() => setVersionUploadModalOpen(false)}
        onSubmit={handleVersionUpload}
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

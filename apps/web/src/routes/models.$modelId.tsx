import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { ModelDetailError } from '@/components/model-detail/model-detail-error';
import { ModelDetailHeader } from '@/components/model-detail/model-detail-header';
import { ModelDetailSkeleton } from '@/components/model-detail/model-detail-skeleton';
// import { ModelGitHistory } from '@/components/model-detail/model-git-history'; // Git not implemented yet
import { ModelInfoCard } from '@/components/model-detail/model-info-card';
import { ModelPreviewCard } from '@/components/model-detail/model-preview-card';
import { ModelVersionHistory } from '@/components/model-detail/model-version-history';
import { EditModelDialog } from '@/components/models/edit-model-dialog';
import { UploadVersionDialog } from '@/components/models/upload-version-dialog';
import { findMainModelFile, useModelDetail } from '@/hooks/use-model-detail';
import { downloadAllFiles } from '@/utils/download';

export const Route = createFileRoute('/models/$modelId')({
  component: ModelDetailComponent,
});

function ModelDetailComponent() {
  const { modelId } = Route.useParams();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const { model, latestVersion, totalSize, history, isLoading, error } =
    useModelDetail(modelId);

  // Get the active version (selected or latest)
  const activeVersion = selectedVersion
    ? (model?.versions.find((v) => v.version === selectedVersion) ??
      latestVersion)
    : latestVersion;

  // Find the main model file for the active version
  const mainModelFile = activeVersion
    ? findMainModelFile(activeVersion.files)
    : undefined;

  const handleDownloadAll = async () => {
    if (!(model && activeVersion)) return;

    try {
      await downloadAllFiles(
        model.id,
        activeVersion.version,
        activeVersion.files
      );
      toast.success('Download started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed');
    }
  };

  const handleVersionSelect = (version: string) => {
    setSelectedVersion(version);
  };

  if (isLoading) {
    return <ModelDetailSkeleton />;
  }

  if (error || !model || !activeVersion) {
    return <ModelDetailError error={error} />;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <ModelDetailHeader
        model={model}
        onDownloadClick={handleDownloadAll}
        onEditClick={() => setEditDialogOpen(true)}
        onUploadClick={() => setUploadDialogOpen(true)}
      />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* 3D Viewer */}
          <ModelPreviewCard
            mainModelFile={mainModelFile}
            modelId={model.id}
            version={activeVersion}
          />
          {/* Git History - removed until Git service is implemented */}
          {/* <div className="h-64">
            <ModelGitHistory history={history} />
          </div> */}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Model Info */}
          <ModelInfoCard
            activeVersion={activeVersion}
            model={model}
            totalSize={totalSize}
          />
          {/* Version History - starts immediately after Model Info */}
          <ModelVersionHistory
            activeVersion={activeVersion.version}
            model={model}
            onVersionSelect={handleVersionSelect}
          />
        </div>
      </div>

      {/* Dialogs */}
      <EditModelDialog
        model={model}
        onOpenChange={setEditDialogOpen}
        open={editDialogOpen}
      />
      <UploadVersionDialog
        model={model}
        onOpenChange={setUploadDialogOpen}
        open={uploadDialogOpen}
      />
    </div>
  );
}

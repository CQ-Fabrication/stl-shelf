import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Calendar,
  Download,
  Edit,
  FileText,
  HardDrive,
  History,
  Tag,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EditModelDialog } from '@/components/models/edit-model-dialog';
import { UploadVersionDialog } from '@/components/models/upload-version-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { STLViewerWithSuspense } from '@/components/viewer/stl-viewer';
import { downloadAllFiles, downloadFile } from '@/utils/download';
import { orpc } from '@/utils/orpc';

export const Route = createFileRoute('/models/$modelId')({
  component: ModelDetailComponent,
});

function ModelDetailComponent() {
  const { modelId } = Route.useParams();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const {
    data: model,
    isLoading,
    error,
  } = useQuery(
    orpc.getModel.queryOptions({
      input: { id: modelId },
    })
  );

  const { data: history } = useQuery(
    orpc.getModelHistory.queryOptions({
      input: { modelId, limit: 5 },
    })
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) {
      return '0 B';
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
  };

  const handleDownloadAll = async () => {
    if (!model) return;

    try {
      const latestVersion = model.versions[0];
      if (!latestVersion) return;

      await downloadAllFiles(
        model.id,
        latestVersion.version,
        latestVersion.files
      );
      toast.success('Download started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed');
    }
  };

  const handleDownloadFile = async (filename: string) => {
    if (!model) return;

    try {
      const latestVersion = model.versions[0];
      if (!latestVersion) return;

      await downloadFile(model.id, latestVersion.version, filename);
      toast.success(`Downloading ${filename}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Download failed');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="aspect-video" />
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="py-12 text-center">
          <div className="mb-2 text-destructive">Failed to load model</div>
          <div className="text-muted-foreground text-sm">
            {error?.message || 'Model not found'}
          </div>
          <Button asChild className="mt-4">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const latestVersion = model.versions[0];
  const totalSize = latestVersion.files.reduce(
    (sum, file) => sum + file.size,
    0
  );
  const mainModelFile = latestVersion.files.find((f) =>
    ['.stl', '.obj', '.3mf', '.ply'].includes(f.extension.toLowerCase())
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-4">
          <Button asChild size="sm" variant="ghost">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 font-bold text-3xl">
              {model.latestMetadata.name}
            </h1>
            {model.latestMetadata.description && (
              <p className="text-muted-foreground">
                {model.latestMetadata.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setUploadDialogOpen(true)} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              New Version
            </Button>
            <Button onClick={() => setEditDialogOpen(true)} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button onClick={handleDownloadAll}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 3D Viewer */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>3D Preview</CardTitle>
              <CardDescription>
                Interactive 3D view of {latestVersion.version}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {mainModelFile ? (
                <div className="aspect-video">
                  <STLViewerWithSuspense
                    className="h-full w-full overflow-hidden rounded-b-lg"
                    filename={mainModelFile.filename}
                    modelId={model.id}
                    version={latestVersion.version}
                  />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-b-lg bg-muted">
                  <div className="text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-12 w-12" />
                    <div>No 3D file available for preview</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Model Info */}
        <div className="space-y-4">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Model Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Created</div>
                    <div className="text-muted-foreground">
                      {formatDate(model.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Size</div>
                    <div className="text-muted-foreground">
                      {formatFileSize(totalSize)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {model.latestMetadata.tags.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {model.latestMetadata.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Print Settings */}
              {model.latestMetadata.printSettings && (
                <div>
                  <div className="mb-2 font-medium text-sm">Print Settings</div>
                  <div className="space-y-1 text-muted-foreground text-sm">
                    {model.latestMetadata.printSettings.material && (
                      <div>
                        Material: {model.latestMetadata.printSettings.material}
                      </div>
                    )}
                    {model.latestMetadata.printSettings.layerHeight && (
                      <div>
                        Layer Height:{' '}
                        {model.latestMetadata.printSettings.layerHeight}mm
                      </div>
                    )}
                    {model.latestMetadata.printSettings.infill && (
                      <div>
                        Infill: {model.latestMetadata.printSettings.infill}%
                      </div>
                    )}
                    {model.latestMetadata.printSettings.printTime && (
                      <div>
                        Print Time:{' '}
                        {Math.floor(
                          model.latestMetadata.printSettings.printTime / 60
                        )}
                        h {model.latestMetadata.printSettings.printTime % 60}m
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Files */}
          <Card>
            <CardHeader>
              <CardTitle>Files ({latestVersion.version})</CardTitle>
              <CardDescription>
                {latestVersion.files.length} file
                {latestVersion.files.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {latestVersion.files.map((file) => (
                  <div
                    className="flex items-center justify-between rounded border p-2"
                    key={file.filename}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">
                          {file.filename}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs" variant="outline">
                        {file.extension.slice(1).toUpperCase()}
                      </Badge>
                      <Button
                        onClick={() => handleDownloadFile(file.filename)}
                        size="sm"
                        variant="ghost"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Versions and History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Version History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </CardTitle>
            <CardDescription>
              {model.totalVersions} version
              {model.totalVersions !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {model.versions.reverse().map((version, index) => (
                <div
                  className="flex items-start justify-between rounded border p-3"
                  key={version.version}
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={index === 0 ? 'default' : 'outline'}>
                        {version.version}
                      </Badge>
                      {index === 0 && (
                        <Badge className="text-xs" variant="secondary">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {formatDate(version.createdAt)} • {version.files.length}{' '}
                      files
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Git History */}
        <Card>
          <CardHeader>
            <CardTitle>Git History</CardTitle>
            <CardDescription>Recent commits for this model</CardDescription>
          </CardHeader>
          <CardContent>
            {history && history.length > 0 ? (
              <div className="space-y-3">
                {history.map((commit) => (
                  <div className="rounded border p-3" key={commit.hash}>
                    <div className="mb-1 font-medium text-sm">
                      {commit.message}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {commit.author_name} • {formatDate(commit.date)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                No git history available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Model Dialog */}
      {model && (
        <EditModelDialog
          model={model}
          onOpenChange={setEditDialogOpen}
          open={editDialogOpen}
        />
      )}

      {/* Upload Version Dialog */}
      {model && (
        <UploadVersionDialog
          model={model}
          onOpenChange={setUploadDialogOpen}
          open={uploadDialogOpen}
        />
      )}
    </div>
  );
}

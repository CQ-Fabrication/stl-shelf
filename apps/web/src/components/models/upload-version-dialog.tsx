import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, FileText, Upload, X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Model } from '../../../../server/src/types/model';

type UploadVersionDialogProps = {
  model: Model;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type UploadFile = {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
};

type UploadVersionFormData = {
  files: UploadFile[];
  description: string;
  tags: string[];
  tagInput: string;
};

const ACCEPTED_FORMATS = {
  'model/stl': ['.stl'],
  'application/sla': ['.stl'],
  'text/plain': ['.obj'],
  'model/obj': ['.obj'],
  'application/x-3mf': ['.3mf'],
  'model/3mf': ['.3mf'],
  'application/x-ply': ['.ply'],
  'model/ply': ['.ply'],
};

const CLOSE_DELAY_MS = 1000;
const MAX_FILE_SIZE_MB = 100;
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * KB_PER_MB * BYTES_PER_KB;
const SIZE_FORMAT_PRECISION = 100;

export function UploadVersionDialog({
  model,
  open,
  onOpenChange,
}: UploadVersionDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      files: [] as UploadFile[],
      description: '',
      tags: model.latestMetadata.tags || [],
      tagInput: '',
    },
    validators: {
      onSubmit: ({ value }) => {
        if (value.files.length === 0) {
          return 'At least one file is required';
        }
        return;
      },
    },
    onSubmit: async ({ value }) => {
      await handleUpload(value);
    },
  });

  // Reset form when dialog opens or when model changes
  useEffect(() => {
    if (open) {
      form.reset({
        files: [],
        description: '',
        tags: model.latestMetadata.tags || [],
        tagInput: '',
      });
    }
  }, [open, form, model.latestMetadata.tags]);

  // Handle dialog close with form reset
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      const shouldReset = !(newOpen || form.state.isSubmitting);
      if (shouldReset) {
        form.reset({
          files: [],
          description: '',
          tags: model.latestMetadata.tags || [],
          tagInput: '',
        });
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, form, model.latestMetadata.tags]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}`,
        status: 'pending',
        progress: 0,
      }));

      form.setFieldValue('files', (prev) => [...prev, ...newFiles]);
    },
    [form]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    multiple: true,
    maxSize: MAX_FILE_SIZE_BYTES,
  });

  const removeFile = (fileId: string) => {
    form.setFieldValue('files', (prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tagInput = form.getFieldValue('tagInput');
      if (tagInput?.trim()) {
        const trimmedTag = tagInput.trim().toLowerCase();
        const currentTags = form.getFieldValue('tags');
        if (!currentTags.includes(trimmedTag)) {
          form.setFieldValue('tags', [...currentTags, trimmedTag]);
        }
        form.setFieldValue('tagInput', '');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setFieldValue('tags', (prev) =>
      prev.filter((tag) => tag !== tagToRemove)
    );
  };

  const createUploadFormData = (formData: UploadVersionFormData) => {
    const { files, description, tags } = formData;
    const uploadFormData = new FormData();

    uploadFormData.append('modelId', model.id);
    uploadFormData.append('name', model.latestMetadata.name);

    if (description.trim()) {
      uploadFormData.append('description', description.trim());
    } else if (model.latestMetadata.description) {
      uploadFormData.append('description', model.latestMetadata.description);
    }

    if (tags.length > 0) {
      uploadFormData.append('tags', JSON.stringify(tags));
    }

    if (model.latestMetadata.printSettings) {
      uploadFormData.append(
        'printSettings',
        JSON.stringify(model.latestMetadata.printSettings)
      );
    }

    for (const { file } of files) {
      uploadFormData.append('files', file);
    }

    return uploadFormData;
  };

  const createNewVersion = (
    files: UploadFile[],
    description: string,
    tags: string[],
    version: string
  ) => ({
    version,
    files: files.map((f) => ({
      filename: f.file.name,
      originalName: f.file.name,
      size: f.file.size,
      mimeType: f.file.type,
      extension: `.${f.file.name.split('.').pop() || ''}`,
    })),
    metadata: {
      name: model.latestMetadata.name,
      description: description.trim() || model.latestMetadata.description,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      printSettings: model.latestMetadata.printSettings,
    },
    createdAt: new Date().toISOString(),
  });

  const updateCachedModelData = (
    result: { version: string },
    newVersion: ReturnType<typeof createNewVersion>
  ) => {
    queryClient.setQueryData(
      ['getModel', { id: model.id }],
      (oldData: Model | undefined) => {
        if (!oldData) {
          return oldData;
        }

        return {
          ...oldData,
          currentVersion: result.version,
          versions: [...oldData.versions, newVersion],
          totalVersions: oldData.totalVersions + 1,
          latestMetadata: newVersion.metadata,
          updatedAt: new Date().toISOString(),
        };
      }
    );
  };

  const refreshQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ['getModel', { id: model.id }],
    });
    queryClient.invalidateQueries({ queryKey: ['listModels'] });
    queryClient.invalidateQueries({
      queryKey: ['getModelHistory', { modelId: model.id }],
    });
  };

  const handleUpload = async (formData: UploadVersionFormData) => {
    const { files, description, tags } = formData;

    if (files.length === 0) {
      toast.error('At least one file is required');
      return;
    }

    try {
      const uploadFormData = createUploadFormData(formData);

      form.setFieldValue(
        'files',
        files.map((f) => ({ ...f, status: 'uploading' as const }))
      );

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/upload`,
        {
          method: 'POST',
          body: uploadFormData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      form.setFieldValue(
        'files',
        files.map((f) => ({ ...f, status: 'success' as const, progress: 100 }))
      );

      toast.success(`New version ${result.version} uploaded successfully!`);

      const newVersion = createNewVersion(
        files,
        description,
        tags,
        result.version
      );
      updateCachedModelData(result, newVersion);
      refreshQueries();

      setTimeout(() => {
        handleOpenChange(false);
      }, CLOSE_DELAY_MS);
    } catch (error) {
      form.setFieldValue(
        'files',
        files.map((f) => ({ ...f, status: 'error' as const }))
      );
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) {
      return '0 B';
    }
    const logBase = Math.log(BYTES_PER_KB);
    const i = Math.floor(Math.log(bytes) / logBase);
    return `${Math.round((bytes / BYTES_PER_KB ** i) * SIZE_FORMAT_PRECISION) / SIZE_FORMAT_PRECISION} ${sizes[i]}`;
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Add a new version to {model.latestMetadata.name}. The new version
            will inherit the current metadata unless modified.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="space-y-4">
            {/* File Upload Area */}
            <form.Field name="files">
              {(field) => (
                <div className="space-y-2">
                  <Label>Model Files</Label>
                  <div
                    {...getRootProps()}
                    className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                      isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <div className="text-sm">
                      {isDragActive ? (
                        <p>Drop the files here...</p>
                      ) : (
                        <div>
                          <p className="font-medium">
                            Drop model files here or click to browse
                          </p>
                          <p className="text-muted-foreground">
                            Supports STL, OBJ, 3MF, PLY files (max{' '}
                            {MAX_FILE_SIZE_MB}MB each)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <div className="text-red-600 text-sm">
                      {field.state.meta.errors.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* File List */}
            <form.Field name="files">
              {(field) => (
                <>
                  {field.state.value.length > 0 && (
                    <div className="space-y-2">
                      <Label>
                        Files to Upload ({field.state.value.length})
                      </Label>
                      <div className="max-h-32 space-y-2 overflow-y-auto">
                        {field.state.value.map((uploadFile) => (
                          <div
                            className="flex items-center justify-between rounded border p-2 text-sm"
                            key={uploadFile.id}
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(uploadFile.status)}
                              <div>
                                <div className="font-medium">
                                  {uploadFile.file.name}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {formatFileSize(uploadFile.file.size)}
                                </div>
                              </div>
                            </div>
                            <Button
                              disabled={form.state.isSubmitting}
                              onClick={() => removeFile(uploadFile.id)}
                              size="sm"
                              type="button"
                              variant="ghost"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </form.Field>

            {/* Description */}
            <form.Field name="description">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Description (optional)</Label>
                  <Input
                    disabled={form.state.isSubmitting}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={
                      model.latestMetadata.description ||
                      'Version description...'
                    }
                    value={field.state.value}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <div className="text-red-600 text-sm">
                      {field.state.meta.errors.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </form.Field>

            {/* Tags */}
            <div className="space-y-2">
              <form.Field name="tagInput">
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Tags</Label>
                    <Input
                      disabled={form.state.isSubmitting}
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Add a tag and press Enter..."
                      value={field.state.value}
                    />
                  </>
                )}
              </form.Field>

              <form.Field name="tags">
                {(field) => (
                  <>
                    {field.state.value.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {field.state.value.map((tag) => (
                          <Badge
                            className="cursor-pointer"
                            key={tag}
                            onClick={() =>
                              !form.state.isSubmitting && removeTag(tag)
                            }
                            variant="secondary"
                          >
                            {tag}
                            {!form.state.isSubmitting && (
                              <X className="ml-1 h-3 w-3" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </form.Field>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={form.state.isSubmitting}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  {isSubmitting ? 'Uploading...' : 'Upload New Version'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

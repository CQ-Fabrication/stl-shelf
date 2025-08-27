import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, FileText, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import type { Model } from '../../../../server/src/types/model';
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

interface UploadVersionDialogProps {
  model: Model;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadFile = {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
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

export function UploadVersionDialog({
  model,
  open,
  onOpenChange,
}: UploadVersionDialogProps) {
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>(model.latestMetadata.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Initialize form with current model data
  const resetForm = useCallback(() => {
    setFiles([]);
    setDescription('');
    setTags(model.latestMetadata.tags || []);
    setTagInput('');
    setIsUploading(false);
  }, [model.latestMetadata.tags]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}`,
      status: 'pending',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    multiple: true,
    maxSize: 100 * 1024 * 1024, // 100MB max file size
  });

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const trimmedTag = tagInput.trim().toLowerCase();
      if (!tags.includes(trimmedTag)) {
        setTags((prev) => [...prev, trimmedTag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const validateForm = () => {
    if (files.length === 0) {
      toast.error('At least one file is required');
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!validateForm()) {
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('modelId', model.id); // Key addition for version upload
      formData.append('name', model.latestMetadata.name); // Keep the same name
      
      if (description.trim()) {
        formData.append('description', description.trim());
      } else if (model.latestMetadata.description) {
        // Inherit previous description if none provided
        formData.append('description', model.latestMetadata.description);
      }
      
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }

      // Add print settings if they exist
      if (model.latestMetadata.printSettings) {
        formData.append('printSettings', JSON.stringify(model.latestMetadata.printSettings));
      }

      // Add all files
      files.forEach(({ file }) => {
        formData.append('files', file);
      });

      // Update file states to uploading
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'uploading' as const }))
      );

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      // Update file states to success
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'success' as const, progress: 100 }))
      );

      toast.success(`New version ${result.version} uploaded successfully!`);

      // Refresh the model data
      queryClient.invalidateQueries({ queryKey: ['getModel', { id: model.id }] });
      queryClient.invalidateQueries({ queryKey: ['listModels'] });

      // Close dialog and reset form after a short delay
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1000);
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'error' as const }))
      );
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Add a new version to {model.latestMetadata.name}. The new version will inherit the current metadata unless modified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Model Files</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
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
                      Supports STL, OBJ, 3MF, PLY files (max 100MB each)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Files to Upload ({files.length})</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {files.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center justify-between rounded border p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(uploadFile.status)}
                      <div>
                        <div className="font-medium">{uploadFile.file.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {formatFileSize(uploadFile.file.size)}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={isUploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={model.latestMetadata.description || 'Version description...'}
              disabled={isUploading}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tagInput">Tags</Label>
            <Input
              id="tagInput"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add a tag and press Enter..."
              disabled={isUploading}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => !isUploading && removeTag(tag)}
                  >
                    {tag}
                    {!isUploading && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
          >
            {isUploading ? 'Uploading...' : 'Upload New Version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
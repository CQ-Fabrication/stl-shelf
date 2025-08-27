import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, CheckCircle, FileText, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

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

const ACCEPTED_EXTENSIONS = ['.stl', '.obj', '.3mf', '.ply'];

export function ModelUpload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}`,
        status: 'pending',
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newFiles]);

      // Auto-set name from first file if not already set
      if (!name && acceptedFiles.length > 0) {
        const fileName = acceptedFiles[0].name;
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        setName(nameWithoutExt);
      }
    },
    [name]
  );

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
    if (!name.trim()) {
      toast.error('Model name is required');
      return false;
    }
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
      formData.append('name', name.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
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

      toast.success(`Successfully uploaded ${result.files} file(s)`);

      // Navigate to the new model
      setTimeout(() => {
        navigate({
          to: '/models/$modelId',
          params: { modelId: result.modelId },
        });
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast.error(message);

      // Update file states to error
      setFiles((prev) => prev.map((f) => ({ ...f, status: 'error' as const })));
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) {
      return '0 B';
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
  };

  const getFileIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        );
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-2 font-bold text-2xl">Upload New Model</h1>
        <p className="text-muted-foreground">
          Upload 3D model files and add metadata to your library.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model Details</CardTitle>
          <CardDescription>
            Provide information about your 3D model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name field */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              disabled={isUploading}
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter model name"
              value={name}
            />
          </div>

          {/* Description field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              disabled={isUploading}
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              value={description}
            />
          </div>

          {/* Tags field */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              disabled={isUploading}
              id="tags"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Type a tag and press Enter"
              value={tagInput}
            />
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge className="gap-1" key={tag} variant="secondary">
                    {tag}
                    <Button
                      className="h-auto w-auto p-0 hover:bg-transparent"
                      disabled={isUploading}
                      onClick={() => removeTag(tag)}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>
            Upload STL, OBJ, 3MF, or PLY files (max 100MB each)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-blue-600">Drop files here...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg">
                  Drag & drop files here, or click to browse
                </p>
                <p className="text-muted-foreground text-sm">
                  Supports: {ACCEPTED_EXTENSIONS.join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Selected Files</h4>
              {files.map((uploadFile) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3"
                  key={uploadFile.id}
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(uploadFile.status)}
                    <div>
                      <div className="font-medium text-sm">
                        {uploadFile.file.name}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatFileSize(uploadFile.file.size)}
                      </div>
                    </div>
                  </div>
                  {uploadFile.status === 'pending' && (
                    <Button
                      disabled={isUploading}
                      onClick={() => removeFile(uploadFile.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          className="flex-1"
          disabled={isUploading || files.length === 0 || !name.trim()}
          onClick={handleUpload}
        >
          {isUploading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Model
            </>
          )}
        </Button>
        <Button
          disabled={isUploading}
          onClick={() => navigate({ to: '/' })}
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

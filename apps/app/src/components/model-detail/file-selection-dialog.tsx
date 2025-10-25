import { Box, FileText } from "lucide-react";
import { useState } from "react";
import { Badge } from "@stl-shelf/ui/components/badge";
import { Button } from "@stl-shelf/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@stl-shelf/ui/components/dialog";
import { Label } from "@stl-shelf/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@stl-shelf/ui/components/radio-group";
import { ScrollArea } from "@stl-shelf/ui/components/scroll-area";
import { formatFileSize } from "@/utils/formatters";

type ModelFile = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  extension: string;
  storageKey: string;
  storageUrl: string | null;
  storageBucket: string;
};

type FileSelectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: ModelFile[];
  onFileSelect: (file: ModelFile) => void;
  title: string;
};

export const FileSelectionDialog = ({
  open,
  onOpenChange,
  files,
  onFileSelect,
  title,
}: FileSelectionDialogProps) => {
  const [selectedFileId, setSelectedFileId] = useState<string>(
    files[0]?.id ?? ""
  );

  const handleConfirm = () => {
    const selectedFile = files.find((f) => f.id === selectedFileId);
    if (selectedFile) {
      onFileSelect(selectedFile);
      onOpenChange(false);
    }
  };

  const getFileIcon = (extension: string) => {
    const ext = extension.toLowerCase();
    if (["stl", "3mf", "obj", "ply"].includes(ext)) {
      return Box;
    }
    return FileText;
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Select which file to open in the slicer
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[300px] pr-4">
          <RadioGroup
            className="gap-3"
            onValueChange={setSelectedFileId}
            value={selectedFileId}
          >
            {files.map((file) => {
              const Icon = getFileIcon(file.extension);
              return (
                <div
                  className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50"
                  key={file.id}
                >
                  <RadioGroupItem id={file.id} value={file.id} />
                  <Label
                    className="flex flex-1 cursor-pointer items-center gap-3"
                    htmlFor={file.id}
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{file.originalName}</div>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Badge className="text-xs" variant="secondary">
                          {file.extension.toUpperCase()}
                        </Badge>
                        <span>{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!selectedFileId} onClick={handleConfirm}>
            Open File
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

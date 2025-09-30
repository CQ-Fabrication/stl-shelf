import { useState } from "react";
import { toast } from "sonner";
import type { SlicerId } from "@/lib/slicers/config";
import { SLICER_CONFIG } from "@/lib/slicers/config";
import {
  filterModelFiles,
  filterSelectableFiles,
  getSlicerUrl,
  type ModelFile,
} from "@/lib/slicers/utils";

type UseFileSelectionParams = {
  files: ModelFile[] | undefined;
  activeVersion: { id: string } | undefined;
};

type UseFileSelectionResult = {
  selectFileForSlicer: (slicerId: SlicerId) => void;
  openInSlicer: (slicerId: SlicerId, file: ModelFile) => void;
  fileDialogOpen: boolean;
  setFileDialogOpen: (open: boolean) => void;
  pendingSlicerId: SlicerId | null;
  handleFileSelection: (file: ModelFile) => void;
  selectableFiles: ModelFile[] | undefined;
};

export const useFileSelection = ({
  files,
  activeVersion,
}: UseFileSelectionParams): UseFileSelectionResult => {
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [pendingSlicerId, setPendingSlicerId] = useState<SlicerId | null>(null);

  const openInSlicer = (slicerId: SlicerId, file: ModelFile) => {
    const config = SLICER_CONFIG[slicerId];

    if (!file.storageUrl) {
      toast.error("File storage URL not available");
      return;
    }

    try {
      const slicerUrl = getSlicerUrl(slicerId, file.storageUrl);
      toast.info(`Opening in ${config.name}...`);

      window.location.href = slicerUrl;

      setTimeout(() => {
        toast.success(
          `Sent to ${config.name}. If it doesn't open, make sure ${config.name} is installed.`
        );
      }, 500);
    } catch (error) {
      toast.error(`Failed to open ${config.name}`);
      console.error(error);
    }
  };

  const selectFileForSlicer = (slicerId: SlicerId) => {
    if (!files) {
      return;
    }

    if (!activeVersion) {
      return;
    }

    const modelFiles = filterModelFiles(files);

    if (modelFiles.length === 0) {
      toast.error("No 3D model files available");
      return;
    }

    // Check for 3MF file (preferred format)
    const threeMfFile = modelFiles.find(
      (f) => f.extension.toLowerCase() === "3mf"
    );

    if (threeMfFile) {
      openInSlicer(slicerId, threeMfFile);
      return;
    }

    // Filter STL and OBJ files
    const stlObjFiles = filterSelectableFiles(modelFiles);

    if (stlObjFiles.length === 1) {
      openInSlicer(slicerId, stlObjFiles[0]);
    } else if (stlObjFiles.length > 1) {
      setPendingSlicerId(slicerId);
      setFileDialogOpen(true);
    } else {
      toast.error("No compatible files (STL, OBJ, or 3MF) available");
    }
  };

  const handleFileSelection = (file: ModelFile) => {
    if (pendingSlicerId) {
      openInSlicer(pendingSlicerId, file);
      setPendingSlicerId(null);
    }
  };

  const selectableFiles = files ? filterSelectableFiles(files) : undefined;

  return {
    selectFileForSlicer,
    openInSlicer,
    fileDialogOpen,
    setFileDialogOpen,
    pendingSlicerId,
    handleFileSelection,
    selectableFiles,
  };
};

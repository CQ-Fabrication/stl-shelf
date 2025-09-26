import { skipToken, useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadFromBlob } from "@/utils/download";
import { orpc } from "@/utils/orpc";
import { FileSelectionDialog } from "./file-selection-dialog";

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

type SlicerAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
};

type SlicerActionsDropdownProps = {
  modelId: string;
  modelName: string;
  versionId?: string;
};

export const SlicerActionsDropdown = ({
  modelId,
  modelName,
  versionId,
}: SlicerActionsDropdownProps) => {
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"bambu" | "prusa" | null>(
    null
  );

  // Fetch model versions to get the latest if no version specified
  const { data: versions } = useQuery(
    orpc.models.getModelVersions.queryOptions({ input: { modelId } })
  );

  const activeVersion = versionId
    ? versions?.find((v) => v.id === versionId)
    : versions?.[0];

  // Fetch files for the active version
  const queryOptions = versionId
    ? { input: { modelId, versionId } }
    : versions?.[0]?.id
      ? { input: { modelId, versionId: versions[0].id } }
      : skipToken;

  const filesQuery = useQuery(
    queryOptions === skipToken
      ? { queryKey: ["skip"], queryFn: skipToken }
      : orpc.models.getModelFiles.queryOptions(queryOptions)
  );

  const files = filesQuery.data;

  // Filter only 3D model files
  const modelFiles = files?.filter((f) =>
    ["stl", "3mf", "obj", "ply"].includes(f.extension.toLowerCase())
  );

  const selectFileForSlicer = (action: "bambu" | "prusa") => {
    if (!files) {
      return;
    }

    // Get fresh data from the current render
    const currentFiles = files?.filter((f) =>
      ["stl", "3mf", "obj", "ply"].includes(f.extension.toLowerCase())
    );

    if (!activeVersion) {
      return; // Don't show error while loading
    }
    if (!currentFiles || currentFiles.length === 0) {
      toast.error("No 3D model files available");
      return;
    }

    // Check for 3MF file (preferred format)
    const threeMfFile = currentFiles.find(
      (f) => f.extension.toLowerCase() === "3mf"
    );

    if (threeMfFile) {
      // Use 3MF directly
      openInSlicer(action, threeMfFile);
      return;
    }

    // Filter STL and OBJ files
    const stlObjFiles = currentFiles.filter((f) =>
      ["stl", "obj"].includes(f.extension.toLowerCase())
    );

    if (stlObjFiles.length === 1) {
      // Single file, use directly
      openInSlicer(action, stlObjFiles[0]);
    } else if (stlObjFiles.length > 1) {
      // Multiple files, show selection dialog
      setPendingAction(action);
      setFileDialogOpen(true);
    } else {
      toast.error("No compatible files (STL, OBJ, or 3MF) available");
    }
  };

  const downloadFileMutation = useMutation(
    orpc.models.downloadFile.mutationOptions()
  );

  const openInSlicer = async (action: "bambu" | "prusa", file: ModelFile) => {
    if (!file.storageKey) {
      toast.error("File storage key not available");
      return;
    }

    try {
      toast.info(`Downloading ${file.originalName}...`);

      const blob = await downloadFileMutation.mutateAsync({
        storageKey: file.storageKey,
      });

      downloadFromBlob(blob, file.originalName);

      if (action === "bambu") {
        toast.success(
          "File downloaded. Please open it manually in Bambu Studio."
        );
      } else {
        toast.success(
          "File downloaded. Please open it manually in PrusaSlicer."
        );
      }
    } catch (error) {
      toast.error("Failed to download file");
      console.error(error);
    }
  };

  const handleFileSelection = (file: ModelFile) => {
    if (pendingAction) {
      openInSlicer(pendingAction, file);
      setPendingAction(null);
    }
  };

  const handleOpenInBambuStudio = () => {
    selectFileForSlicer("bambu");
  };

  const handleOpenInPrusaSlicer = () => {
    selectFileForSlicer("prusa");
  };

  const downloadZipMutation = useMutation(
    orpc.models.downloadVersionZip.mutationOptions()
  );

  const handleDownloadZip = async () => {
    if (!activeVersion?.id) {
      toast.error("No version selected");
      return;
    }

    if (!modelFiles || modelFiles.length === 0) {
      toast.error("No files available to download");
      return;
    }

    try {
      toast.info("Preparing ZIP download...");

      const blob = await downloadZipMutation.mutateAsync({
        modelId,
        versionId: activeVersion.id,
      });

      downloadFromBlob(blob, `${modelName}.zip`);

      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download files");
      console.error(error);
    }
  };

  const actions: SlicerAction[] = [
    {
      id: "bambu",
      label: "Open in Bambu Studio",
      icon: (
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Bambu Studio</title>
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
        </svg>
      ),
      action: handleOpenInBambuStudio,
    },
    {
      id: "prusa",
      label: "Open in PrusaSlicer",
      icon: (
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>PrusaSlicer</title>
          <rect height="18" rx="2" width="18" x="3" y="3" />
          <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" />
        </svg>
      ),
      action: handleOpenInPrusaSlicer,
    },
    {
      id: "zip",
      label: "Download ZIP",
      icon: <Download className="h-4 w-4" />,
      action: handleDownloadZip,
    },
  ];

  const [selectedAction, setSelectedAction] = useState<SlicerAction>(
    actions[0]
  );
  const [isOpen, setIsOpen] = useState(false);

  const handleActionSelect = (action: SlicerAction) => {
    setSelectedAction(action);
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    // Call the action directly with current context, not the stale closure
    if (selectedAction.id === "bambu") {
      handleOpenInBambuStudio();
    } else if (selectedAction.id === "prusa") {
      handleOpenInPrusaSlicer();
    } else if (selectedAction.id === "zip") {
      handleDownloadZip();
    }
  };

  // Filter STL and OBJ files for the dialog
  const selectableFiles = modelFiles?.filter((f) =>
    ["stl", "obj"].includes(f.extension.toLowerCase())
  );

  return (
    <>
      <div className="flex">
        <Button
          className="w-52 justify-start gap-2 rounded-r-none bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={handleButtonClick}
          size="sm"
        >
          {selectedAction.icon}
          <span className="truncate">{selectedAction.label}</span>
        </Button>
        <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              className="rounded-l-none border-l border-l-brand-foreground/20 bg-brand px-2 text-brand-foreground hover:bg-brand/90"
              size="sm"
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[245px]">
            {actions.map((action) => (
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                key={action.id}
                onClick={() => handleActionSelect(action)}
              >
                {action.icon}
                <span>{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectableFiles && selectableFiles.length > 0 && (
        <FileSelectionDialog
          files={selectableFiles}
          onFileSelect={handleFileSelection}
          onOpenChange={setFileDialogOpen}
          open={fileDialogOpen}
          title={
            pendingAction === "bambu"
              ? "Select File for Bambu Studio"
              : "Select File for PrusaSlicer"
          }
        />
      )}
    </>
  );
};

import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@stl-shelf/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@stl-shelf/ui/components/dropdown-menu";
import { useFileSelection } from "@/hooks/use-file-selection";
import { useModelFiles } from "@/hooks/use-model-files";
import { useZipDownload } from "@/hooks/use-zip-download";
import {
  SLICER_CONFIG,
  type SlicerConfig,
  type SlicerId,
} from "@/lib/slicers/config";
import { FileSelectionDialog } from "./file-selection-dialog";

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
  const { files, modelFiles, activeVersion } = useModelFiles({
    modelId,
    versionId,
  });

  const {
    selectFileForSlicer,
    fileDialogOpen,
    setFileDialogOpen,
    pendingSlicerId,
    handleFileSelection,
    selectableFiles,
  } = useFileSelection({ files, activeVersion });

  const { handleDownloadZip } = useZipDownload({
    modelId,
    modelName,
    activeVersion,
    modelFiles,
  });

  const slicerActions: SlicerAction[] = (
    Object.entries(SLICER_CONFIG) as [SlicerId, SlicerConfig][]
  ).map(([id, config]) => ({
    id,
    label: `Open in ${config.name}`,
    icon: config.icon,
    action: () => selectFileForSlicer(id),
  }));

  const actions: SlicerAction[] = [
    ...slicerActions,
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
    selectedAction.action();
  };

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

      {selectableFiles && selectableFiles.length > 0 && pendingSlicerId && (
        <FileSelectionDialog
          files={selectableFiles}
          onFileSelect={handleFileSelection}
          onOpenChange={setFileDialogOpen}
          open={fileDialogOpen}
          title={`Select File for ${SLICER_CONFIG[pendingSlicerId].name}`}
        />
      )}
    </>
  );
};

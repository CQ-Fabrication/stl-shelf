import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ModelFile } from "@/lib/model-files";
import { downloadFromBlob } from "@/utils/download";
import { orpc } from "@/utils/orpc";

type UseZipDownloadParams = {
  modelId: string;
  modelName: string;
  activeVersion: { id: string } | undefined;
  modelFiles: ModelFile[] | undefined;
};

type UseZipDownloadResult = {
  handleDownloadZip: () => Promise<void>;
  isDownloading: boolean;
};

export const useZipDownload = ({
  modelId,
  modelName,
  activeVersion,
  modelFiles,
}: UseZipDownloadParams): UseZipDownloadResult => {
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

  return {
    handleDownloadZip,
    isDownloading: downloadZipMutation.isPending,
  };
};

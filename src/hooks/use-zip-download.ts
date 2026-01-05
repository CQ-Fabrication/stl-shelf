import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorContextActions } from "@/stores/error-context.store";
import { triggerDownload } from "@/utils/download";

type UseZipDownloadParams = {
  modelId: string;
  modelName: string;
  activeVersion: { id: string } | undefined;
};

type UseZipDownloadResult = {
  handleDownloadZip: () => Promise<void>;
  isDownloading: boolean;
};

/**
 * Hook for downloading model files as a ZIP archive
 * Uses server-side streaming ZIP creation (no client-side assembly)
 */
export const useZipDownload = ({
  modelId,
  modelName,
  activeVersion,
}: UseZipDownloadParams): UseZipDownloadResult => {
  const downloadZipMutation = useMutation({
    mutationFn: async (versionId: string) => {
      // Fetch streaming ZIP from server route
      const response = await fetch(`/api/download/version/${versionId}/zip`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to download files");
        }
        if (response.status === 404) {
          throw new Error("Version not found or no files available");
        }
        throw new Error(response.statusText || "Download failed");
      }

      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `${modelName}.zip`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      // Get blob from streaming response
      const blob = await response.blob();

      return { blob, filename };
    },
  });

  const handleDownloadZip = async () => {
    if (!activeVersion?.id) {
      toast.error("No version selected");
      return;
    }

    // Track download action for error context
    errorContextActions.setLastAction({
      type: "download",
      modelId,
      versionId: activeVersion.id,
      metadata: { modelName },
    });

    try {
      toast.info("Preparing download...");

      const { blob, filename } = await downloadZipMutation.mutateAsync(activeVersion.id);

      // Use existing triggerDownload utility (anchor element pattern)
      triggerDownload(blob, filename);

      toast.success("Download started");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to download files";
      toast.error(message);
      console.error("Download error:", error);
    }
  };

  return {
    handleDownloadZip,
    isDownloading: downloadZipMutation.isPending,
  };
};

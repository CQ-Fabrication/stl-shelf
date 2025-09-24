/**
 * Triggers a browser download from a blob
 */
export const triggerDownload = (blob: Blob, filename: string): void => {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
};

/**
 * Handles Blob object from RPC and triggers download
 */
export const downloadFromBlob = (
  blob: Blob,
  filename: string
): void => {
  triggerDownload(blob, filename);
};

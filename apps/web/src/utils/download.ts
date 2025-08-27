/**
 * Utility functions for handling file downloads
 */

/**
 * Downloads a single file from the server
 */
export const downloadFile = async (
  modelId: string,
  version: string,
  filename: string,
  serverUrl = import.meta.env.VITE_SERVER_URL
): Promise<void> => {
  try {
    const url = `${serverUrl}/files/${modelId}/${version}/${filename}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);

    // Create temporary download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    throw new Error(
      `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Downloads multiple files as a ZIP archive
 */
export const downloadAllFiles = async (
  modelId: string,
  version: string,
  files: Array<{ filename: string }>,
  serverUrl = import.meta.env.VITE_SERVER_URL
): Promise<void> => {
  try {
    // Import JSZip dynamically
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // Download all files and add to zip
    const downloads = files.map(async (file) => {
      const url = `${serverUrl}/files/${modelId}/${version}/${file.filename}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to download ${file.filename}: ${response.statusText}`
        );
      }

      const blob = await response.blob();
      zip.file(file.filename, blob);
    });

    await Promise.all(downloads);

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(zipBlob);

    // Create temporary download link
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${modelId}-${version}.zip`;
    document.body.appendChild(link);

    // Trigger download
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    throw new Error(
      `Zip download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

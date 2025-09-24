export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatFileSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) {
    return '0 B';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / 1024 ** i) * 100) / 100} ${sizes[i]}`;
};

export const formatPrintTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const getFileExtension = (filename: string): string => {
  const ext = filename.split('.').pop();
  return ext ? ext.toUpperCase() : '';
};

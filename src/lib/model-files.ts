export type ModelFile = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  extension: string;
  storageKey: string;
  storageUrl: string | null;
  storageBucket: string;
  createdAt: string;
};

const MODEL_FILE_EXTENSIONS = ["stl", "3mf", "obj", "ply"] as const;

export const filterModelFiles = (files: ModelFile[]): ModelFile[] =>
  files.filter((f) =>
    MODEL_FILE_EXTENSIONS.includes(
      f.extension.toLowerCase() as (typeof MODEL_FILE_EXTENSIONS)[number],
    ),
  );

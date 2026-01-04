export type ModelFile = {
  id: string;
  versionId: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  extension: string;
  storageKey: string;
  storageUrl: string | null;
  storageBucket: string;
  fileMetadata?: {
    boundingBox?: {
      width: number;
      height: number;
      depth: number;
      volume?: number;
    };
    triangleCount?: number;
    vertexCount?: number;
    isClosed?: boolean;
    isManifold?: boolean;
    estimatedVolume?: number;
    estimatedWeight?: number;
    units?: "mm" | "in" | "cm";
    threeMfMetadata?: {
      application?: string;
      version?: string;
      materials?: Array<{
        id: string;
        name: string;
        color?: string;
      }>;
      printSettings?: {
        layerHeight?: number;
        infill?: number;
        supports?: boolean;
      };
    };
    processed: boolean;
    processedAt?: string;
    processingErrors?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
};

export type ModelVersion = {
  id: string;
  modelId: string;
  version: string;
  name: string;
  description: string | null;
  thumbnailPath: string | null;
  printSettings?: {
    material?: string;
    layerHeight?: number;
    infill?: number;
    printTime?: number;
    weight?: number;
    supports?: boolean;
    raftBrim?: "none" | "raft" | "brim";
    temperature?: {
      nozzle?: number;
      bed?: number;
    };
    speed?: {
      print?: number;
      travel?: number;
      firstLayer?: number;
    };
  };
  files: ModelFile[];
  createdAt: Date;
  updatedAt: Date;
};

export type Model = {
  id: string;
  organizationId: string;
  ownerId: string;
  slug: string;
  name: string;
  description: string | null;
  currentVersion: string;
  totalVersions: number;
  versions: ModelVersion[];
  tags: string[];
  latestMetadata: {
    createdAt: string;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ModelStatistics = {
  totalSize: number;
  totalFiles: number;
  totalVersions: number;
  fileTypes: Record<string, number>;
  largestFile: {
    name: string;
    size: number;
  } | null;
  averageFileSize: number;
  lastUpdated: Date;
};

export type ModelTag = {
  id: string;
  name: string;
  color: string | null;
  usageCount: number;
  description: string | null;
};

export type ModelMetadata = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  currentVersion: string;
  totalVersions: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

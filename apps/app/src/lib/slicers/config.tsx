import type { ReactNode } from "react";
import { BambuStudioIcon, PrusaSlicerIcon } from "./icons";

export type SlicerId = "bambu" | "prusa";

export type SlicerConfig = {
  name: string;
  urlScheme: string;
  icon: ReactNode;
};

export const SLICER_CONFIG = {
  bambu: {
    name: "Bambu Studio",
    urlScheme: "bambustudioopen://open?file=",
    icon: <BambuStudioIcon />,
  },
  prusa: {
    name: "PrusaSlicer",
    urlScheme: "prusaslicer://open?file=",
    icon: <PrusaSlicerIcon />,
  },
} as const satisfies Record<SlicerId, SlicerConfig>;

export const MODEL_FILE_EXTENSIONS = ["stl", "3mf", "obj", "ply", "step", "stp"] as const;
export const SELECTABLE_FILE_EXTENSIONS = ["stl", "obj"] as const;
export const PREFERRED_FILE_EXTENSION = "3mf" as const;

import { Store } from "@tanstack/react-store";

export type ActionType =
  | "view_model"
  | "view_file"
  | "upload"
  | "download"
  | "delete"
  | "preview_3d"
  | "navigate"
  | null;

export type ActionContext = {
  type: ActionType;
  modelId: string | null;
  fileId: string | null;
  versionId: string | null;
  metadata?: Record<string, unknown>;
};

export type ErrorContextState = {
  lastAction: ActionContext;
};

const initialState: ErrorContextState = {
  lastAction: {
    type: null,
    modelId: null,
    fileId: null,
    versionId: null,
  },
};

export const errorContextStore = new Store<ErrorContextState>(initialState);

export const errorContextActions = {
  setLastAction: (action: Partial<ActionContext> & { type: ActionType }) => {
    errorContextStore.setState((state) => ({
      ...state,
      lastAction: {
        type: action.type,
        modelId: action.modelId ?? null,
        fileId: action.fileId ?? null,
        versionId: action.versionId ?? null,
        metadata: action.metadata,
      },
    }));
  },

  clearAction: () => {
    errorContextStore.setState(() => initialState);
  },
};

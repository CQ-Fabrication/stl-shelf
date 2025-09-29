import { Store } from "@tanstack/react-store";

export type UploadStep = 1 | 2 | 3;

export type UploadModalState = {
  isOpen: boolean;
  currentStep: UploadStep;
  completedSteps: Set<number>;
  formData: {
    name: string;
    description: string;
    tags: string[];
    files: File[];
    previewImage?: File;
    previewImageUrl?: string;
  };
};

const initialState: UploadModalState = {
  isOpen: false,
  currentStep: 1,
  completedSteps: new Set<number>(),
  formData: {
    name: "",
    description: "",
    tags: [],
    files: [],
    previewImage: undefined,
    previewImageUrl: undefined,
  },
};

export const uploadModalStore = new Store<UploadModalState>(initialState);

export const uploadModalActions = {
  openModal: () => {
    uploadModalStore.setState((state) => ({
      ...state,
      isOpen: true,
    }));
  },

  closeModal: () => {
    uploadModalStore.setState(() => initialState);
  },

  setStep: (step: UploadStep) => {
    const currentState = uploadModalStore.state;
    if (uploadModalActions.canNavigateToStep(step, currentState)) {
      uploadModalStore.setState((state) => ({
        ...state,
        currentStep: step,
      }));
    }
  },

  markStepCompleted: (step: number) => {
    uploadModalStore.setState((state) => ({
      ...state,
      completedSteps: new Set([...state.completedSteps, step]),
    }));
  },

  updateFormData: <K extends keyof UploadModalState["formData"]>(
    key: K,
    value: UploadModalState["formData"][K]
  ) => {
    uploadModalStore.setState((state) => ({
      ...state,
      formData: { ...state.formData, [key]: value },
    }));
  },

  resetForm: () => {
    uploadModalStore.setState(() => initialState);
  },

  canNavigateToStep: (step: number, state: UploadModalState): boolean => {
    if (step === 1) return true;
    if (step === 2) return state.completedSteps.has(1);
    if (step === 3)
      return state.completedSteps.has(1) && state.completedSteps.has(2);
    return false;
  },
};

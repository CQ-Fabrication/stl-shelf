import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/ui/stepper";
import {
  uploadModalActions,
  uploadModalStore,
} from "@/stores/upload-modal.store";
import { MODELS_QUERY_KEY } from "@/hooks/use-delete-model";
import { useUploadLimits } from "@/hooks/use-upload-limits";
import { createModel, getAllTags } from "@/server/functions/models";
import { StepDetails } from "./steps/step-details";
import { StepFiles } from "./steps/step-files";
import { UploadBlockedState } from "./upload-blocked-state";
import { UploadUsageIndicator } from "./upload-usage-indicator";
import { modelUploadSchema } from "./use-upload-form";

const UPLOAD_STEPS = [
  { id: "details", label: "Details", description: "Name & tags" },
  { id: "files", label: "Files", description: "Models & preview" },
];

export function UploadModal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modalState = useStore(uploadModalStore, (state) => state);
  const { isOpen, currentStep, formData } = modalState;

  // Track if we hit a race condition (user was OK when modal opened but blocked on submit)
  const [raceConditionBlocked, setRaceConditionBlocked] = useState(false);

  // Fetch fresh limits when modal opens
  const {
    limits,
    isLoading: isLoadingLimits,
    refetch: refetchLimits,
  } = useUploadLimits({ enabled: isOpen });

  // Reset race condition state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRaceConditionBlocked(false);
    }
  }, [isOpen]);

  const { data: availableTags = [] } = useQuery({
    queryKey: ["tags", "all"],
    queryFn: () => getAllTags(),
    enabled: isOpen,
  });

  const createModelMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      tags: string[];
      files: File[];
      previewImage?: File;
    }) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("description", data.description);
      formData.append("tags", JSON.stringify(data.tags));
      for (const file of data.files) {
        formData.append("files", file);
      }
      if (data.previewImage) {
        formData.append("previewImage", data.previewImage);
      }
      return createModel({ data: formData });
    },
    onSuccess: (data) => {
      toast.success(`Successfully created model: ${data.slug}`);
      queryClient.invalidateQueries({ queryKey: MODELS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["tags", "all"] });
      uploadModalActions.resetForm();
      navigate({
        to: "/models/$modelId",
        params: { modelId: data.modelId },
      });
    },
    onError: (error) => {
      console.error("Model creation error:", error);

      // Check if this is a limit-related error (race condition)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isLimitError =
        errorMessage.includes("Model limit reached") ||
        errorMessage.includes("Storage limit exceeded");

      if (isLimitError) {
        // Race condition: another upload completed while user was filling form
        toast.error(
          "Another upload completed while you were working. You're now at your limit."
        );
        setRaceConditionBlocked(true);
        refetchLimits();
      } else {
        toast.error("Failed to create model. Please try again.");
      }
    },
  });

  const form = useForm({
    defaultValues: formData,
    validators: {
      onSubmit: modelUploadSchema,
    },
    onSubmit: ({ value }) => {
      createModelMutation.mutate(value);
    },
  });

  useEffect(() => {
    form.setFieldValue("name", formData.name);
    form.setFieldValue("description", formData.description);
    form.setFieldValue("tags", formData.tags);
    form.setFieldValue("files", formData.files);
    form.setFieldValue("previewImage", formData.previewImage);
  }, [formData, form]);

  const handleStepClick = (stepIndex: number) => {
    if (uploadModalActions.canNavigateToStep(stepIndex, modalState)) {
      uploadModalActions.setStep(stepIndex as 1 | 2);
    }
  };

  const handleClose = () => {
    uploadModalActions.closeModal();
  };

  // Determine if user is blocked (either from fresh check or race condition)
  const isBlocked = limits?.blocked || raceConditionBlocked;

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()} open={isOpen}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        showCloseButton={!createModelMutation.isPending}
      >
        <DialogHeader>
          <DialogTitle>
            {isBlocked ? "Upload Limit Reached" : "Upload New Model"}
          </DialogTitle>
          {!isLoadingLimits && !isBlocked && limits && (
            <DialogDescription asChild>
              <UploadUsageIndicator limits={limits} />
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Loading state while fetching limits */}
        {isLoadingLimits && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Checking your usage limits...
            </p>
          </div>
        )}

        {/* Blocked state - show upgrade options */}
        {!isLoadingLimits && isBlocked && limits && (
          <UploadBlockedState limits={limits} onClose={handleClose} />
        )}

        {/* Normal upload flow when not blocked */}
        {!isLoadingLimits && !isBlocked && (
          <>
            <div className="mb-6">
              <Stepper onValueChange={handleStepClick} value={currentStep}>
                {UPLOAD_STEPS.map((step, index) => {
                  const stepNumber = index + 1;
                  const isCompleted = modalState.completedSteps.has(stepNumber);
                  return (
                    <StepperItem
                      className="not-last:flex-1"
                      completed={isCompleted}
                      disabled={
                        !uploadModalActions.canNavigateToStep(
                          stepNumber,
                          modalState
                        )
                      }
                      key={step.id}
                      step={stepNumber}
                    >
                      <StepperTrigger className="flex flex-col gap-1">
                        <StepperIndicator />
                        <div className="mt-2 text-center">
                          <StepperTitle>{step.label}</StepperTitle>
                          <StepperDescription className="hidden sm:block">
                            {step.description}
                          </StepperDescription>
                        </div>
                      </StepperTrigger>
                      {stepNumber < UPLOAD_STEPS.length && <StepperSeparator />}
                    </StepperItem>
                  );
                })}
              </Stepper>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {currentStep === 1 && (
                <StepDetails
                  availableTags={availableTags}
                  form={form}
                  onNext={() => {
                    uploadModalActions.markStepCompleted(1);
                    uploadModalActions.setStep(2);
                  }}
                />
              )}

              {currentStep === 2 && (
                <StepFiles
                  form={form}
                  isSubmitting={createModelMutation.isPending}
                  onPrev={() => uploadModalActions.setStep(1)}
                  onSubmit={() => form.handleSubmit()}
                />
              )}
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

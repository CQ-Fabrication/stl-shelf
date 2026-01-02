import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
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
import { createModel, getAllTags } from "@/server/functions/models";
import { StepDetails } from "./steps/step-details";
import { StepFiles } from "./steps/step-files";
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
      queryClient.invalidateQueries({ queryKey: ["tags", "all"] });
      uploadModalActions.resetForm();
      navigate({
        to: "/models/$modelId",
        params: { modelId: data.modelId },
      });
    },
    onError: (error) => {
      console.error("Model creation error:", error);
      toast.error("Failed to create model. Please try again.");
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

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()} open={isOpen}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        showCloseButton={!createModelMutation.isPending}
      >
        <DialogHeader>
          <DialogTitle>Upload New Model</DialogTitle>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}

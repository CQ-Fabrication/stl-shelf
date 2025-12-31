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
} from "@stl-shelf/ui/components/dialog";
import {
  Stepper,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@stl-shelf/ui/components/stepper";
import {
  uploadModalActions,
  uploadModalStore,
} from "@/stores/upload-modal.store";
import { orpc } from "@/utils/orpc";
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
    ...orpc.models.getAllTags.queryOptions(),
    // Only fetch tags when modal is open
    enabled: isOpen,
  });

  const createModelMutation = useMutation(
    orpc.models.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Successfully created model: ${data.slug}`);
        queryClient.invalidateQueries({
          queryKey: orpc.models.getAllTags.key(),
        });
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
    })
  );

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

import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
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
import { orpc } from "@/utils/orpc";
import { StepDetails } from "./steps/step-details";
import { StepFiles } from "./steps/step-files";
import { StepPreview } from "./steps/step-preview";

const modelUploadSchema = z.object({
  name: z
    .string()
    .min(1, "Model name is required")
    .max(200, "Name must be less than 200 characters"),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .transform((val) => (val === "" ? undefined : val)),
  tags: z.array(z.string().min(1).max(64)).max(20, "Maximum 20 tags allowed"),
  files: z
    .array(z.instanceof(File))
    .min(1, "At least one file is required")
    .max(5, "Maximum 5 files allowed"),
  previewImage: z.union([z.instanceof(File), z.undefined()]),
});

const UPLOAD_STEPS = [
  { id: "details", label: "Details", description: "Name & tags" },
  { id: "files", label: "Files", description: "3D models" },
  { id: "preview", label: "Preview", description: "Cover image" },
];

export function UploadModal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modalState = useStore(uploadModalStore, (state) => state);
  const { isOpen, currentStep, formData } = modalState;

  const { data: availableTags = [] } = useQuery(
    orpc.models.getAllTags.queryOptions()
  );

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
        const message =
          error instanceof Error ? error.message : "Upload failed";
        toast.error(message);
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
      uploadModalActions.setStep(stepIndex as 1 | 2 | 3);
    }
  };

  const handleClose = () => {
    uploadModalActions.closeModal();
  };

  return (
    <Dialog onOpenChange={(open) => !open && handleClose()} open={isOpen}>
      <DialogContent
        className="sm:max-w-3xl"
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
              onNext={() => {
                uploadModalActions.markStepCompleted(2);
                uploadModalActions.setStep(3);
              }}
              onPrev={() => uploadModalActions.setStep(1)}
            />
          )}

          {currentStep === 3 && (
            <StepPreview
              form={form}
              isSubmitting={createModelMutation.isPending}
              onPrev={() => uploadModalActions.setStep(2)}
              onSubmit={() => form.handleSubmit()}
            />
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

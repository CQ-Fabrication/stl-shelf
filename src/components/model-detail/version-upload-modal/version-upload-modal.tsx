import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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
import { UploadBlockedState } from "@/components/models/upload-modal/upload-blocked-state";
import { UploadUsageIndicator } from "@/components/models/upload-modal/upload-usage-indicator";
import { useUploadLimits } from "@/hooks/use-upload-limits";
import {
  type VersionUploadFormData,
  versionUploadFormDefaultValues,
} from "../use-version-upload-form";
import { StepChangelog } from "./steps/step-changelog";
import { StepFiles } from "./steps/step-files";

const VERSION_UPLOAD_STEPS = [
  { id: "files", label: "Files", description: "Models & preview" },
  { id: "changelog", label: "Changelog", description: "What changed" },
];

type VersionUploadModalProps = {
  modelId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VersionUploadFormData) => void;
  isSubmitting: boolean;
};

export function VersionUploadModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: VersionUploadModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Fetch fresh limits when modal opens (only care about storage for versions)
  const {
    limits,
    isLoading: isLoadingLimits,
  } = useUploadLimits({ enabled: isOpen });

  // For version uploads, only storage limits matter (not model count)
  const isStorageBlocked = limits?.storage.blocked ?? false;

  const form = useForm({
    defaultValues: versionUploadFormDefaultValues,
    onSubmit: ({ value }) => {
      onSubmit(value);
    },
  });

  const handleStepClick = (stepIndex: number) => {
    // Can navigate to step if it's completed or is the next step
    if (completedSteps.has(stepIndex) || stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      setCurrentStep(1);
      setCompletedSteps(new Set());
      onClose();
    }
  };

  const handleFilesNext = () => {
    setCompletedSteps((prev) => new Set([...prev, 1]));
    setCurrentStep(2);
  };

  const handleChangelogPrev = () => {
    setCurrentStep(1);
  };

  const handleSubmit = () => {
    form.handleSubmit();
  };

  return (
    <Dialog onOpenChange={(open: boolean) => !open && handleClose()} open={isOpen}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
        showCloseButton={!isSubmitting}
      >
        <DialogHeader>
          <DialogTitle>
            {isStorageBlocked ? "Storage Limit Reached" : "Upload New Version"}
          </DialogTitle>
          {!isLoadingLimits && !isStorageBlocked && limits && (
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
              Checking your storage limits...
            </p>
          </div>
        )}

        {/* Blocked state - show upgrade options */}
        {!isLoadingLimits && isStorageBlocked && limits && (
          <UploadBlockedState limits={limits} onClose={handleClose} />
        )}

        {/* Normal upload flow when not blocked */}
        {!isLoadingLimits && !isStorageBlocked && (
          <>
            <div className="mb-6">
              <Stepper onValueChange={handleStepClick} value={currentStep}>
                {VERSION_UPLOAD_STEPS.map((step, index) => {
                  const stepNumber = index + 1;
                  const isCompleted = completedSteps.has(stepNumber);
                  const canNavigate =
                    isCompleted || stepNumber <= currentStep;

                  return (
                    <StepperItem
                      className="not-last:flex-1"
                      completed={isCompleted}
                      disabled={!canNavigate}
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
                      {stepNumber < VERSION_UPLOAD_STEPS.length && (
                        <StepperSeparator />
                      )}
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
                <StepFiles form={form} onNext={handleFilesNext} />
              )}

              {currentStep === 2 && (
                <StepChangelog
                  form={form}
                  isSubmitting={isSubmitting}
                  onPrev={handleChangelogPrev}
                  onSubmit={handleSubmit}
                />
              )}
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

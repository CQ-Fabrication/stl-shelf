/**
 * Unknown Slicer Feedback Form
 *
 * Inline form shown when a 3MF file's slicer couldn't be detected.
 * Allows users to submit feedback about what slicer they used.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { submitSlicerFeedback } from "@/server/functions/print-profiles";

type UnknownSlicerFormProps = {
  profileId: string;
};

export const UnknownSlicerForm = ({ profileId }: UnknownSlicerFormProps) => {
  const [slicerName, setSlicerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!slicerName.trim()) return;

    setIsSubmitting(true);
    try {
      await submitSlicerFeedback({ data: { profileId, slicerName: slicerName.trim() } });
      setSubmitted(true);
      toast.success("Thanks for the feedback!");
    } catch {
      toast.error("Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
        <Check className="h-3 w-3 text-green-500" />
        <span>Thanks for the feedback!</span>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <AlertCircle className="h-3 w-3" />
        <span>Unknown slicer - help us improve?</span>
      </div>
      <div className="flex gap-2">
        <Input
          className="h-7 text-xs"
          disabled={isSubmitting}
          onChange={(e) => setSlicerName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="What slicer did you use?"
          value={slicerName}
        />
        <Button
          className="h-7 text-xs"
          disabled={isSubmitting || !slicerName.trim()}
          onClick={handleSubmit}
          size="sm"
          variant="outline"
        >
          Send
        </Button>
      </div>
    </div>
  );
};

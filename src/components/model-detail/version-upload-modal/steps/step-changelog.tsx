import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VersionUploadFormType } from "../../use-version-upload-form";

type StepChangelogProps = {
  form: VersionUploadFormType;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export function StepChangelog({ form, onPrev, onSubmit, isSubmitting }: StepChangelogProps) {
  const handleSubmit = () => {
    const changelog = form.state.values.changelog.trim();

    if (!changelog) {
      toast.error("Changelog required", {
        description: "Please describe what changed in this version",
      });
      return;
    }

    if (changelog.length > 2000) {
      toast.error("Changelog too long", {
        description: "Maximum 2000 characters allowed",
      });
      return;
    }

    onSubmit();
  };

  return (
    <div className="space-y-6">
      {/* Changelog */}
      <div className="space-y-2">
        <form.Field name="changelog">
          {(field) => (
            <>
              <Label htmlFor="changelog">
                Changelog <span className="text-destructive">*</span>
              </Label>
              <Textarea
                disabled={isSubmitting}
                id="changelog"
                onBlur={field.handleBlur}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  field.handleChange(e.target.value)
                }
                placeholder="Describe what changed in this version..."
                rows={6}
                value={field.state.value}
              />
              <p className="text-muted-foreground text-xs">
                {field.state.value.length}/2000 characters
              </p>
            </>
          )}
        </form.Field>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button disabled={isSubmitting} onClick={onPrev} type="button" variant="outline">
          Previous
        </Button>
        <Button disabled={isSubmitting} onClick={handleSubmit} type="button">
          {isSubmitting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Version
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

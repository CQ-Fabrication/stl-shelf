import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagCombobox } from "@/components/ui/tag-combobox";
import { uploadModalActions } from "@/stores/upload-modal.store";
import type { UploadFormType } from "../use-upload-form";

type StepDetailsProps = {
  form: UploadFormType;
  availableTags: Array<{
    name: string;
    color: string | null;
    usageCount: number;
  }>;
  onNext: () => void;
};

export function StepDetails({ form, availableTags, onNext }: StepDetailsProps) {
  const handleNext = () => {
    const name = form.state.values.name;
    const description = form.state.values.description;
    const tags = form.state.values.tags;

    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push("Name is required");
    } else if (name.length > 200) {
      errors.push("Name must be less than 200 characters");
    }

    if (description && description.length > 2000) {
      errors.push("Description must be less than 2000 characters");
    }

    if (tags && tags.length > 20) {
      errors.push("Maximum 20 tags allowed");
    }

    if (errors.length > 0) {
      form.setFieldMeta("name", (prev: any) => ({
        ...prev,
        errors,
        isValidating: false,
      }));
      return;
    }

    uploadModalActions.updateFormData("name", name);
    uploadModalActions.updateFormData("description", description || "");
    uploadModalActions.updateFormData("tags", tags || []);

    onNext();
  };

  return (
    <div className="space-y-4">
      <form.Field name="name">
        {(field: any) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>
              Name <sup className="-ml-1 text-red-600">*</sup>
            </Label>
            <Input
              
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter model name"
              value={field.state.value}
            />
            {field.state.meta.errors.length > 0 && (
              <div className="text-red-600 text-sm">
                {field.state.meta.errors.join(", ")}
              </div>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field: any) => (
          <div className="space-y-2">
            <Label htmlFor={field.name}>Description</Label>
            <Input
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Optional description"
              value={field.state.value || ""}
            />
            {field.state.meta.errors.length > 0 && (
              <div className="text-red-600 text-sm">
                {field.state.meta.errors.join(", ")}
              </div>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="tags">
        {(field: any) => (
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagCombobox
              allowCreate={true}
              availableTags={availableTags}
              onTagsChange={(tags) => field.handleChange(tags)}
              placeholder="Select or create tags..."
              selectedTags={field.state.value}
            />
            {field.state.meta.errors.length > 0 && (
              <div className="text-red-600 text-sm">
                {field.state.meta.errors.join(", ")}
              </div>
            )}
          </div>
        )}
      </form.Field>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} type="button">
          Next
        </Button>
      </div>
    </div>
  );
}

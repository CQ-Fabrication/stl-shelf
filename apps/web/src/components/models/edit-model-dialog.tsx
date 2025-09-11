import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createMetadataFromFormData,
  type EditModelFormData,
  validateNumericField,
  validateRequiredField,
} from '@/types/forms';
import { orpc } from '@/utils/orpc';
import type { Model } from '../../../../server/src/types/model';

type EditModelDialogProps = {
  model: Model;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MIN_LAYER_HEIGHT = 0.01;
const MAX_LAYER_HEIGHT = 1;
const MIN_INFILL = 0;
const MAX_INFILL = 100;

export function EditModelDialog({
  model,
  open,
  onOpenChange,
}: EditModelDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: model.latestMetadata.name,
      description: model.latestMetadata.description || '',
      tags: model.latestMetadata.tags || [],
      tagInput: '',
      material: model.latestMetadata.printSettings?.material || '',
      layerHeight:
        model.latestMetadata.printSettings?.layerHeight?.toString() || '',
      infill: model.latestMetadata.printSettings?.infill?.toString() || '',
      printTime:
        model.latestMetadata.printSettings?.printTime?.toString() || '',
      weight: model.latestMetadata.printSettings?.weight?.toString() || '',
    } as EditModelFormData,
    validators: {
      onSubmit: ({ value }) => {
        const nameError = validateRequiredField(value.name, 'Model name');
        if (nameError) {
          return nameError;
        }

        const layerHeightError = validateNumericField(
          value.layerHeight,
          'Layer height',
          MIN_LAYER_HEIGHT,
          MAX_LAYER_HEIGHT
        );
        if (layerHeightError) {
          return layerHeightError;
        }

        const infillError = validateNumericField(
          value.infill,
          'Infill',
          MIN_INFILL,
          MAX_INFILL
        );
        if (infillError) {
          return infillError;
        }

        const printTimeError = validateNumericField(
          value.printTime,
          'Print time',
          0
        );
        if (printTimeError) {
          return printTimeError;
        }

        const weightError = validateNumericField(value.weight, 'Weight', 0);
        if (weightError) {
          return weightError;
        }

        return;
      },
    },
    onSubmit: ({ value }) => {
      handleUpdate(value);
    },
  });

  const updateMutation = useMutation(
    orpc.updateModelMetadata.mutationOptions({
      onSuccess: async () => {
        // Simply invalidate all queries to force refresh
        await queryClient.invalidateQueries();
        toast.success('Model updated successfully');
        handleOpenChange(false);
      },
      onError: (error) => {
        toast.error(`Failed to update model: ${error.message}`);
      },
    })
  );

  // Reset form when dialog opens or when model changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: model.latestMetadata.name,
        description: model.latestMetadata.description || '',
        tags: model.latestMetadata.tags || [],
        tagInput: '',
        material: model.latestMetadata.printSettings?.material || '',
        layerHeight:
          model.latestMetadata.printSettings?.layerHeight?.toString() || '',
        infill: model.latestMetadata.printSettings?.infill?.toString() || '',
        printTime:
          model.latestMetadata.printSettings?.printTime?.toString() || '',
        weight: model.latestMetadata.printSettings?.weight?.toString() || '',
      });
    }
  }, [open, form, model]);

  // Handle dialog close with form reset
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      const shouldReset = !(newOpen || updateMutation.isPending);
      if (shouldReset) {
        form.reset({
          name: model.latestMetadata.name,
          description: model.latestMetadata.description || '',
          tags: model.latestMetadata.tags || [],
          tagInput: '',
          material: model.latestMetadata.printSettings?.material || '',
          layerHeight:
            model.latestMetadata.printSettings?.layerHeight?.toString() || '',
          infill: model.latestMetadata.printSettings?.infill?.toString() || '',
          printTime:
            model.latestMetadata.printSettings?.printTime?.toString() || '',
          weight: model.latestMetadata.printSettings?.weight?.toString() || '',
        });
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, form, model, updateMutation.isPending]
  );

  const handleUpdate = (formData: EditModelFormData) => {
    const metadata = createMetadataFromFormData(formData, model);
    updateMutation.mutate({
      modelId: model.id,
      metadata,
    });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tagInput = form.getFieldValue('tagInput');
      if (tagInput?.trim()) {
        const trimmedTag = tagInput.trim().toLowerCase();
        const currentTags = form.getFieldValue('tags');
        if (!currentTags.includes(trimmedTag)) {
          form.setFieldValue('tags', [...currentTags, trimmedTag]);
        }
        form.setFieldValue('tagInput', '');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setFieldValue('tags', (prev: string[]) =>
      prev.filter((tag) => tag !== tagToRemove)
    );
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Model</DialogTitle>
          <DialogDescription>
            Update the metadata and information for {model.latestMetadata.name}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) =>
                    validateRequiredField(value, 'Model name'),
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Model Name</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <div className="text-red-600 text-sm">
                        {field.state.meta.errors.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="description">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Description</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Optional description"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <div className="text-red-600 text-sm">
                        {field.state.meta.errors.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <form.Field name="tagInput">
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Tags</Label>
                    <Input
                      disabled={updateMutation.isPending}
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Add a tag and press Enter..."
                      value={field.state.value}
                    />
                  </>
                )}
              </form.Field>

              <form.Field name="tags">
                {(field) => (
                  <>
                    {field.state.value.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {field.state.value.map((tag) => (
                          <Badge
                            className="cursor-pointer"
                            key={tag}
                            onClick={() =>
                              !updateMutation.isPending && removeTag(tag)
                            }
                            variant="secondary"
                          >
                            {tag}
                            {!updateMutation.isPending && (
                              <X className="ml-1 h-3 w-3" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </form.Field>
            </div>

            {/* Print Settings */}
            <div className="space-y-3">
              <Label className="font-medium text-base">Print Settings</Label>
              <div className="grid grid-cols-2 gap-4">
                <form.Field name="material">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Material</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g., PLA, ABS, PETG"
                        value={field.state.value}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <div className="text-red-600 text-sm">
                          {field.state.meta.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field
                  name="layerHeight"
                  validators={{
                    onChange: ({ value }) =>
                      validateNumericField(
                        value,
                        'Layer height',
                        MIN_LAYER_HEIGHT,
                        MAX_LAYER_HEIGHT
                      ),
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Layer Height (mm)</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="0.2"
                        step="0.01"
                        type="number"
                        value={field.state.value}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <div className="text-red-600 text-sm">
                          {field.state.meta.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field
                  name="infill"
                  validators={{
                    onChange: ({ value }) =>
                      validateNumericField(
                        value,
                        'Infill',
                        MIN_INFILL,
                        MAX_INFILL
                      ),
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Infill (%)</Label>
                      <Input
                        id={field.name}
                        max="100"
                        min="0"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="20"
                        type="number"
                        value={field.state.value}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <div className="text-red-600 text-sm">
                          {field.state.meta.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </form.Field>

                <form.Field
                  name="printTime"
                  validators={{
                    onChange: ({ value }) =>
                      validateNumericField(value, 'Print time', 0),
                  }}
                >
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Print Time (minutes)</Label>
                      <Input
                        id={field.name}
                        min="0"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="120"
                        type="number"
                        value={field.state.value}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <div className="text-red-600 text-sm">
                          {field.state.meta.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field
                name="weight"
                validators={{
                  onChange: ({ value }) =>
                    validateNumericField(value, 'Weight', 0),
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Weight (grams)</Label>
                    <Input
                      className="w-full"
                      id={field.name}
                      min="0"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="25.5"
                      step="0.1"
                      type="number"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <div className="text-red-600 text-sm">
                        {field.state.meta.errors.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              disabled={updateMutation.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit]}>
              {([canSubmit]) => (
                <Button
                  disabled={!canSubmit || updateMutation.isPending}
                  type="submit"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

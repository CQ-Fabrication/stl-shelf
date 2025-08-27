import type { Model } from '../../../server/src/types/model';

// Common form data types
export type EditModelFormData = {
  name: string;
  description: string;
  tags: string[];
  tagInput: string;
  material: string;
  layerHeight: string;
  infill: string;
  printTime: string;
  weight: string;
};

// Tag management utilities
export const createTagHandlers = (
  form: {
    getFieldValue: (name: keyof EditModelFormData) => any;
    setFieldValue: (name: keyof EditModelFormData, value: any) => void;
  },
  isSubmitting: boolean
) => {
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

  return {
    handleAddTag,
    removeTag,
    isSubmitting,
  };
};

// Form validation utilities
export const validateRequiredField = (value: string, fieldName: string) => {
  if (!(value && value.trim())) {
    return `${fieldName} is required`;
  }
  return;
};

export const validateNumericField = (
  value: string,
  fieldName: string,
  min?: number,
  max?: number
) => {
  if (value && value.trim()) {
    const numValue = Number.parseFloat(value);
    if (Number.isNaN(numValue)) {
      return `${fieldName} must be a valid number`;
    }
    if (min !== undefined && numValue < min) {
      return `${fieldName} must be at least ${min}`;
    }
    if (max !== undefined && numValue > max) {
      return `${fieldName} must not exceed ${max}`;
    }
  }
  return;
};

// Form data conversion utilities
export const parseNumericValue = (value: string): number | undefined => {
  if (!(value && value.trim())) return;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const parseIntegerValue = (value: string): number | undefined => {
  if (!(value && value.trim())) return;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

// Create metadata payload from form data
export const createMetadataFromFormData = (
  formData: EditModelFormData,
  model: Model
) => ({
  name: formData.name.trim(),
  description: formData.description.trim() || undefined,
  tags: formData.tags,
  createdAt: model.latestMetadata.createdAt,
  updatedAt: new Date().toISOString(),
  printSettings: {
    material: formData.material.trim() || undefined,
    layerHeight: parseNumericValue(formData.layerHeight),
    infill: parseNumericValue(formData.infill),
    printTime: parseIntegerValue(formData.printTime),
    weight: parseNumericValue(formData.weight),
  },
});

import { useForm } from "@tanstack/react-form";

// Form data type
export type VersionUploadFormData = {
  changelog: string;
  files: File[];
  previewImage?: File;
};

// Default values
export const versionUploadFormDefaultValues: VersionUploadFormData = {
  changelog: "",
  files: [],
  previewImage: undefined,
};

// Function ONLY for type inference - DO NOT call directly
// Parent uses useForm directly, child components use this type
const _createVersionUploadFormForTypeInference = () =>
  useForm({
    defaultValues: versionUploadFormDefaultValues,
    onSubmit: () => {},
  });

// INFERRED TYPE from form - this resolves the FormApi error
export type VersionUploadFormType = ReturnType<
  typeof _createVersionUploadFormForTypeInference
>;

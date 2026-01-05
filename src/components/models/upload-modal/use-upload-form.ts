import { useForm } from "@tanstack/react-form";
import { z } from "zod";

// Schema per validazione (usato in upload-modal.tsx)
export const modelUploadSchema = z.object({
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

// Default values type
export type UploadFormData = {
  name: string;
  description: string;
  tags: string[];
  files: File[];
  previewImage?: File;
  previewImageUrl?: string;
};

// Default values (usati in upload-modal.tsx)
export const uploadFormDefaultValues: UploadFormData = {
  name: "",
  description: "",
  tags: [],
  files: [],
  previewImage: undefined,
  previewImageUrl: undefined,
};

// Funzione SOLO per inferenza del tipo - NON chiamare direttamente
// Il parent usa useForm direttamente, i child usano questo tipo
const _createUploadFormForTypeInference = () =>
  useForm({
    defaultValues: uploadFormDefaultValues,
    validators: {
      onSubmit: modelUploadSchema,
    },
    onSubmit: () => {},
  });

// TIPO INFERITO dal form - questo risolve l'errore FormApi
export type UploadFormType = ReturnType<typeof _createUploadFormForTypeInference>;

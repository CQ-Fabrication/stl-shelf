import { ZodError, z } from 'zod';
import { SecurityError } from '../security';

const MAX_JSON_SIZE = 10_000;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS = 20;
const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 2000;

export const FileUploadSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(MAX_NAME_LENGTH)
    .refine(
      (name) => !(name.includes('..') || /[<>:"/\\|?*]/.test(name)),
      'Invalid characters in filename'
    ),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
  tags: z.array(z.string().max(MAX_TAG_LENGTH)).max(MAX_TAGS).optional(),
  printSettings: z.record(z.string(), z.unknown()).optional(),
  modelId: z.string().uuid().optional(),
});

export const TagsSchema = z.array(z.string().max(MAX_TAG_LENGTH)).max(MAX_TAGS);

export const PrintSettingsSchema = z.record(z.string(), z.unknown()).refine(
  (obj) => {
    const stringified = JSON.stringify(obj);
    return stringified.length <= MAX_JSON_SIZE;
  },
  { message: 'Print settings object is too large' }
);

export const ModelIdSchema = z.string().uuid();

export const VersionSchema = z
  .string()
  .regex(/^v\d+$/, 'Version must be in format v1, v2, etc');

export const FilenameSchema = z
  .string()
  .min(1)
  .max(MAX_NAME_LENGTH)
  .refine(
    (name) => {
      if (name.includes('..')) return false;
      if (/[<>:"/\\|?*]/.test(name)) return false;
      if (name.startsWith('.')) return false;
      if (name.endsWith(' ')) return false;
      return true;
    },
    { message: 'Invalid filename' }
  );

export function safeJSONParse<T>(
  input: string,
  schema: z.ZodSchema<T>,
  maxSize = MAX_JSON_SIZE
): T {
  try {
    if (input.length > maxSize) {
      throw new SecurityError('JSON payload too large', 'PAYLOAD_TOO_LARGE');
    }

    const parsed = JSON.parse(input);

    if (parsed && typeof parsed === 'object') {
      delete parsed.__proto__;
      delete parsed.constructor;
      delete parsed.prototype;
    }

    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof SecurityError) throw error;
    if (error instanceof ZodError) {
      throw new SecurityError(
        `Invalid JSON format: ${(error as any).errors?.[0]?.message || 'Unknown error'}`,
        'INVALID_JSON'
      );
    }
    throw new SecurityError('Invalid JSON format', 'INVALID_JSON');
  }
}

export function sanitizeString(input: string, maxLength = 1000): string {
  if (typeof input !== 'string') return '';

  return input
    .substring(0, maxLength)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export function validatePaginationParams(offset?: number, limit?: number) {
  const validatedOffset = Math.max(0, Math.floor(offset || 0));
  const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit || 20)));

  return {
    offset: validatedOffset,
    limit: validatedLimit,
  };
}

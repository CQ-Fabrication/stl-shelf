import { join, relative, resolve } from 'node:path';

/**
 * Security utilities for input validation and path traversal prevention
 */

// Constants for validation limits
const MAX_MODEL_ID_LENGTH = 100;
const MAX_FILENAME_LENGTH = 255;
const KILOBYTE = 1024;
const MEGABYTE_SIZE = 100;
const DEFAULT_MAX_FILE_SIZE = MEGABYTE_SIZE * KILOBYTE * KILOBYTE; // 100MB
const BYTES_PER_MB = KILOBYTE * KILOBYTE;
const MAX_TAGS_COUNT = 20;
const MAX_TAG_LENGTH = 50;
const MAX_TEXT_LENGTH = 1000;
const MAX_GIT_INPUT_LENGTH = 255;
const MAX_COMMIT_MESSAGE_LENGTH = 200;

// Regex patterns for input validation
const SAFE_MODEL_ID_REGEX = /^[a-z0-9][a-z0-9\-_]*[a-z0-9]$/i;
const SAFE_VERSION_REGEX = /^v\d+$/;
// Allow spaces in filenames (common in user uploads) while still constraining characters
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._ \-]*[a-zA-Z0-9]$/;
const TAG_REGEX = /^[a-zA-Z0-9\-_\s]+$/;
const ALLOWED_FILE_EXTENSIONS = new Set([
  '.stl',
  '.obj',
  '.3mf',
  '.ply',
  '.png',
  '.jpg',
  '.jpeg',
  '.json',
]);

/**
 * Security error types for better error handling
 */
export class SecurityError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
  }
}

export class PathTraversalError extends SecurityError {
  constructor(path: string) {
    super(`Path traversal attempt detected: ${path}`, 'PATH_TRAVERSAL');
  }
}

export class InvalidInputError extends SecurityError {
  constructor(field: string, value: string) {
    super(`Invalid ${field}: ${value}`, 'INVALID_INPUT');
  }
}

/**
 * Validates and sanitizes a model ID
 * @param modelId - The model ID to validate
 * @returns The sanitized model ID
 * @throws {InvalidInputError} If the model ID is invalid
 */
export function validateModelId(modelId: string): string {
  if (!modelId || typeof modelId !== 'string') {
    throw new InvalidInputError('modelId', modelId || 'undefined');
  }

  const trimmed = modelId.trim();

  if (!trimmed || trimmed.length > MAX_MODEL_ID_LENGTH) {
    throw new InvalidInputError('modelId', `must be 1-${MAX_MODEL_ID_LENGTH} characters`);
  }

  if (!SAFE_MODEL_ID_REGEX.test(trimmed)) {
    throw new InvalidInputError('modelId', 'contains invalid characters');
  }

  return trimmed;
}

/**
 * Validates and sanitizes a version string
 * @param version - The version to validate
 * @returns The sanitized version
 * @throws {InvalidInputError} If the version is invalid
 */
export function validateVersion(version: string): string {
  if (!version || typeof version !== 'string') {
    throw new InvalidInputError('version', version || 'undefined');
  }

  const trimmed = version.trim();

  if (!SAFE_VERSION_REGEX.test(trimmed)) {
    throw new InvalidInputError('version', 'must match format v[number]');
  }

  return trimmed;
}

/**
 * Validates and sanitizes a filename
 * @param filename - The filename to validate
 * @returns The sanitized filename
 * @throws {InvalidInputError} If the filename is invalid
 */
export function validateFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    throw new InvalidInputError('filename', filename || 'undefined');
  }

  const trimmed = filename.trim();

  if (!trimmed || trimmed.length > MAX_FILENAME_LENGTH) {
    throw new InvalidInputError('filename', `must be 1-${MAX_FILENAME_LENGTH} characters`);
  }

  if (!SAFE_FILENAME_REGEX.test(trimmed)) {
    throw new InvalidInputError('filename', 'contains invalid characters');
  }

  // Check file extension
  const ext = trimmed.toLowerCase().substring(trimmed.lastIndexOf('.'));
  if (!ALLOWED_FILE_EXTENSIONS.has(ext)) {
    throw new InvalidInputError(
      'filename',
      `unsupported file extension: ${ext}`
    );
  }

  return trimmed;
}

/**
 * Safely constructs and validates a file path within the data directory
 * Prevents path traversal attacks by ensuring the resolved path is within the base directory
 *
 * @param baseDir - The base data directory
 * @param modelId - The model ID (will be validated)
 * @param version - The version (will be validated)
 * @param filename - Optional filename (will be validated if provided)
 * @returns The safe, resolved file path
 * @throws {PathTraversalError} If path traversal is detected
 * @throws {InvalidInputError} If any input is invalid
 */
export function constructSecurePath(
  baseDir: string,
  modelId: string,
  version: string,
  filename?: string
): string {
  // Validate all inputs
  const safeModelId = validateModelId(modelId);
  const safeVersion = validateVersion(version);
  const safeFilename = filename ? validateFilename(filename) : undefined;

  // Construct the path
  const pathComponents = [baseDir, safeModelId, safeVersion];
  if (safeFilename) {
    pathComponents.push(safeFilename);
  }

  const requestedPath = join(...pathComponents);

  // Resolve both paths to get absolute paths
  const resolvedBasePath = resolve(baseDir);
  const resolvedRequestedPath = resolve(requestedPath);

  // Check if the resolved path is within the base directory
  const relativePath = relative(resolvedBasePath, resolvedRequestedPath);

  // If the relative path starts with '..' or is empty, it's outside the base directory
  if (relativePath.startsWith('..') || relativePath === '') {
    throw new PathTraversalError(requestedPath);
  }

  // Additional check: ensure the resolved path actually starts with the base path
  if (
    !resolvedRequestedPath.startsWith(`${resolvedBasePath}/`) &&
    resolvedRequestedPath !== resolvedBasePath
  ) {
    throw new PathTraversalError(requestedPath);
  }

  return resolvedRequestedPath;
}

/**
 * Validates file size for uploads
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes (default: 100MB)
 * @throws {InvalidInputError} If file size exceeds limit
 */
export function validateFileSize(
  size: number,
  maxSize: number = DEFAULT_MAX_FILE_SIZE
): void {
  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / BYTES_PER_MB);
    const actualSizeMB = Math.round(size / BYTES_PER_MB);
    throw new InvalidInputError(
      'fileSize',
      `${actualSizeMB}MB exceeds limit of ${maxSizeMB}MB`
    );
  }
}

/**
 * Sanitizes a string for safe use in commit messages or descriptions
 * @param input - The input string to sanitize
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns The sanitized string
 */
export function sanitizeText(input: string, maxLength = MAX_TEXT_LENGTH): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters and limit length
  return input
    .trim()
    .replace(/[<>'"&]/g, '') // Remove HTML/XML chars
    .replace(/\r\n|\r|\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .substring(0, maxLength);
}

/**
 * Validates and sanitizes tags array
 * @param tags - Array of tags to validate
 * @returns Array of sanitized tags
 * @throws {InvalidInputError} If tags are invalid
 */
export function validateTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  if (tags.length > MAX_TAGS_COUNT) {
    throw new InvalidInputError('tags', `maximum ${MAX_TAGS_COUNT} tags allowed`);
  }

  const sanitizedTags: string[] = [];

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      continue;
    }

    const trimmed = tag.trim().toLowerCase();

    if (!trimmed || trimmed.length > MAX_TAG_LENGTH) {
      continue;
    }

    if (!TAG_REGEX.test(trimmed)) {
      continue;
    }

    if (!sanitizedTags.includes(trimmed)) {
      sanitizedTags.push(trimmed);
    }
  }

  return sanitizedTags;
}

/**
 * Sanitizes input for Git operations to prevent command injection
 * @param input - The input string to sanitize
 * @returns The sanitized string safe for Git operations
 */
export function sanitizeGitInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove any characters that could be used for command injection
  // Allow only alphanumeric, hyphens, underscores, dots, and forward slashes
  return input
    .trim()
    .replace(/[^a-zA-Z0-9\-_./\s]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .substring(0, MAX_GIT_INPUT_LENGTH); // Limit length
}

/**
 * Validates a Git commit message for safety
 * @param message - The commit message to validate
 * @returns The sanitized commit message
 */
export function validateGitCommitMessage(message: string): string {
  if (!message || typeof message !== 'string') {
    return 'Update files';
  }

  // Sanitize commit message
  return (
    message
      .trim()
      .replace(/[<>'"&$`|;]/g, '') // Remove potentially dangerous characters
      .replace(/\r\n|\r|\n/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .substring(0, MAX_COMMIT_MESSAGE_LENGTH) || // Limit length
    'Update files'
  ); // Fallback if empty after sanitization
}

import { resolve, join, relative } from 'node:path';

/**
 * Security utilities for input validation and path traversal prevention
 */

// Regex patterns for input validation
const SAFE_MODEL_ID_REGEX = /^[a-z0-9][a-z0-9\-_]*[a-z0-9]$/i;
const SAFE_VERSION_REGEX = /^v\d+$/;
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._\-]*[a-zA-Z0-9]$/;
const ALLOWED_FILE_EXTENSIONS = new Set(['.stl', '.obj', '.3mf', '.ply', '.png', '.jpg', '.jpeg', '.json']);

/**
 * Security error types for better error handling
 */
export class SecurityError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SecurityError';
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
  
  if (!trimmed || trimmed.length > 100) {
    throw new InvalidInputError('modelId', 'must be 1-100 characters');
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
  
  if (!trimmed || trimmed.length > 255) {
    throw new InvalidInputError('filename', 'must be 1-255 characters');
  }

  if (!SAFE_FILENAME_REGEX.test(trimmed)) {
    throw new InvalidInputError('filename', 'contains invalid characters');
  }

  // Check file extension
  const ext = trimmed.toLowerCase().substring(trimmed.lastIndexOf('.'));
  if (!ALLOWED_FILE_EXTENSIONS.has(ext)) {
    throw new InvalidInputError('filename', `unsupported file extension: ${ext}`);
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
  if (!resolvedRequestedPath.startsWith(resolvedBasePath + '/') && 
      resolvedRequestedPath !== resolvedBasePath) {
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
export function validateFileSize(size: number, maxSize: number = 100 * 1024 * 1024): void {
  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    const actualSizeMB = Math.round(size / (1024 * 1024));
    throw new InvalidInputError('fileSize', `${actualSizeMB}MB exceeds limit of ${maxSizeMB}MB`);
  }
}

/**
 * Sanitizes a string for safe use in commit messages or descriptions
 * @param input - The input string to sanitize
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns The sanitized string
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
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

  const MAX_TAGS = 20;
  const MAX_TAG_LENGTH = 50;
  const TAG_REGEX = /^[a-zA-Z0-9\-_\s]+$/;

  if (tags.length > MAX_TAGS) {
    throw new InvalidInputError('tags', `maximum ${MAX_TAGS} tags allowed`);
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
    .replace(/[^a-zA-Z0-9\-_\.\/\s]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .substring(0, 255); // Limit length
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
  return message
    .trim()
    .replace(/[<>'"&$`|;]/g, '') // Remove potentially dangerous characters
    .replace(/\r\n|\r|\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .substring(0, 200) // Limit length
    || 'Update files'; // Fallback if empty after sanitization
}
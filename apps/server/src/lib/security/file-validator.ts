import { SecurityError } from '../security';

const ALLOWED_3D_EXTENSIONS = new Set([
  '.stl',
  '.3mf',
  '.obj',
  '.gcode',
  '.ply',
  '.amf',
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const MAGIC_NUMBERS = {
  STL_ASCII: Buffer.from('solid '),
  STL_BINARY: Buffer.from([0x84, 0x00, 0x00, 0x00]),
  ZIP_3MF: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  OBJ_ASCII: Buffer.from('# '),
  OBJ_V: Buffer.from('v '),
  OBJ_VN: Buffer.from('vn'),
  OBJ_VT: Buffer.from('vt'),
  PLY_ASCII: Buffer.from('ply\n'),
  PLY_FORMAT: Buffer.from('format'),
  GCODE_COMMENT: Buffer.from(';'),
  GCODE_COMMAND: Buffer.from('G'),
  PNG: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  JPEG: Buffer.from([0xff, 0xd8, 0xff]),
  WEBP: Buffer.from('RIFF'),
};

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function validateFileContent(file: File): Promise<void> {
  const filename = file.name.toLowerCase();
  const extension = filename.substring(filename.lastIndexOf('.'));

  const is3DFile = ALLOWED_3D_EXTENSIONS.has(extension);
  const isImage = ALLOWED_IMAGE_EXTENSIONS.has(extension);

  if (!(is3DFile || isImage)) {
    throw new SecurityError(
      `File type not allowed: ${extension}`,
      'INVALID_FILE_TYPE'
    );
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > maxSize) {
    throw new SecurityError(
      `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`,
      'FILE_TOO_LARGE'
    );
  }

  const headerBytes = 512;
  const fullBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(fullBuffer.slice(0, headerBytes));

  const isValidContent = await validateMagicNumbers(buffer, extension, isImage);

  if (!isValidContent) {
    throw new SecurityError(
      'File content does not match extension',
      'CONTENT_TYPE_MISMATCH'
    );
  }

  if (!isImage) {
    await validateNoExecutableContent(buffer);
  }
}

function validateMagicNumbers(
  buffer: Uint8Array,
  extension: string,
  isImage: boolean
): boolean {
  if (isImage) {
    switch (extension) {
      case '.png':
        return compareBytes(buffer, MAGIC_NUMBERS.PNG);
      case '.jpg':
      case '.jpeg':
        return compareBytes(buffer, MAGIC_NUMBERS.JPEG);
      case '.webp':
        return (
          compareBytes(buffer, MAGIC_NUMBERS.WEBP) &&
          compareBytes(buffer.slice(8, 12), Buffer.from('WEBP'))
        );
      default:
        return false;
    }
  }

  switch (extension) {
    case '.stl':
      return (
        compareBytes(buffer, MAGIC_NUMBERS.STL_ASCII) ||
        validateBinarySTL(buffer)
      );
    case '.3mf':
      return compareBytes(buffer, MAGIC_NUMBERS.ZIP_3MF);
    case '.obj':
      return validateOBJContent(buffer);
    case '.ply':
      return (
        compareBytes(buffer, MAGIC_NUMBERS.PLY_ASCII) ||
        compareBytes(buffer, MAGIC_NUMBERS.PLY_FORMAT)
      );
    case '.gcode':
      return validateGCodeContent(buffer);
    default:
      return false;
  }
}

function compareBytes(
  buffer: Uint8Array,
  signature: Buffer,
  offset = 0
): boolean {
  if (buffer.length < offset + signature.length) return false;

  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
}

function validateBinarySTL(buffer: Uint8Array): boolean {
  if (buffer.length < 84) return false;

  const triangleCount =
    (buffer[80] || 0) |
    ((buffer[81] || 0) << 8) |
    ((buffer[82] || 0) << 16) |
    ((buffer[83] || 0) << 24);

  return triangleCount > 0 && triangleCount < 10_000_000;
}

function validateOBJContent(buffer: Uint8Array): boolean {
  const text = new TextDecoder('utf-8', { fatal: false })
    .decode(buffer)
    .toLowerCase();

  const hasVertex = /^v\s+[\d.-]+\s+[\d.-]+\s+[\d.-]+/m.test(text);
  const hasComment = /^#/m.test(text);
  const hasFace = /^f\s+/m.test(text);

  return hasVertex || hasComment || hasFace;
}

function validateGCodeContent(buffer: Uint8Array): boolean {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);

  const hasGCommand = /^[GM]\d+/m.test(text);
  const hasComment = /^;/m.test(text);

  return hasGCommand || hasComment;
}

function validateNoExecutableContent(buffer: Uint8Array): void {
  const text = new TextDecoder('utf-8', { fatal: false })
    .decode(buffer)
    .toLowerCase();

  const suspiciousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /data:text\/html/i,
    /<object/i,
    /<embed/i,
    /onclick=/i,
    /onerror=/i,
    /eval\(/i,
    /\.exe/i,
    /\.dll/i,
    /\.bat/i,
    /\.cmd/i,
    /\.ps1/i,
    /\.sh/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      throw new SecurityError(
        'File contains potentially malicious content',
        'MALICIOUS_CONTENT'
      );
    }
  }
}

export function validateFileSizeForType(size: number, extension: string): void {
  const isImage = ALLOWED_IMAGE_EXTENSIONS.has(extension);
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;

  if (size > maxSize) {
    throw new SecurityError(
      `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`,
      'FILE_TOO_LARGE'
    );
  }

  if (size === 0) {
    throw new SecurityError('File is empty', 'EMPTY_FILE');
  }
}

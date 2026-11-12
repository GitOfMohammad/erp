const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const env = require('../config/env');
const ErrorApi = require('../api/ErrorApi');

const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const DEFAULT_FIELD_NAME = 'file';

const FILE_TYPES = Object.freeze({
  image: {
    directory: 'images',
    extensions: ['.jpg', '.jpeg', '.png'],
    mimeTypes: ['image/jpeg', 'image/png'],
  },
  'private-image': {
    directory: 'private-images',
    extensions: ['.jpg', '.jpeg', '.png'],
    mimeTypes: ['image/jpeg', 'image/png'],
  },
  excel: {
    directory: 'excells',
    extensions: ['.xls', '.xlsx'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  word: {
    directory: 'words',
    extensions: ['.doc', '.docx'],
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  pdf: {
    directory: 'pdfs',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
  },
  csv: {
    directory: 'csvs',
    extensions: ['.csv'],
    mimeTypes: ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'],
  },
});

function resolveDestination(type, subdirectory) {
  const baseDirectory = path.resolve(env.uploads.directory, type.directory);
  if (!subdirectory) return baseDirectory;

  if (typeof subdirectory !== 'string' || subdirectory.trim() === '') {
    throw ErrorApi.badRequest('مسیر زیرپوشه معتبر نیست');
  }

  const requestedPath = subdirectory.trim();
  const segments = requestedPath.split(/[\\/]+/);
  if (
    path.isAbsolute(requestedPath) ||
    /^[a-zA-Z]:/.test(requestedPath) ||
    segments.some((segment) => segment === '.' || segment === '..')
  ) {
    throw ErrorApi.badRequest('مسیر زیرپوشه مجاز نیست');
  }

  const destination = path.resolve(baseDirectory, ...segments);
  const relativePath = path.relative(baseDirectory, destination);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw ErrorApi.badRequest('مسیر زیرپوشه مجاز نیست');
  }

  return destination;
}

function createUploader(typeName, { subdirectory, fieldName = DEFAULT_FIELD_NAME } = {}) {
  const type = FILE_TYPES[typeName];
  if (!type) throw new TypeError(`Unsupported upload type: ${typeName}`);
  if (typeof fieldName !== 'string' || fieldName.trim() === '') {
    throw new TypeError('Upload field name must be a non-empty string');
  }

  const destination = resolveDestination(type, subdirectory);
  const configuredMaxSize = Number(env.uploads.maxFileSizeBytes) || IMAGE_MAX_SIZE_BYTES;
  const maxFileSize = typeName === 'image' || typeName === 'private-image'
    ? Math.min(configuredMaxSize, IMAGE_MAX_SIZE_BYTES)
    : configuredMaxSize;

  const storage = multer.diskStorage({
    destination(req, file, callback) {
      fs.mkdir(destination, { recursive: true }, (error) => callback(error, destination));
    },
    filename(req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  });

  const fileFilter = (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const extensionIsAllowed = type.extensions.includes(extension);
    const mimeTypeIsAllowed = type.mimeTypes.includes(file.mimetype.toLowerCase());

    if (!extensionIsAllowed || !mimeTypeIsAllowed) {
      return callback(ErrorApi.badRequest(
        `نوع فایل مجاز نیست. پسوندهای مجاز: ${type.extensions.join(', ')}`,
      ));
    }

    return callback(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
      files: 1,
      fields: 30,
      parts: 31,
    },
  }).single(fieldName);
}

class Upload {
  static image(subdirectory = 'general', fieldName = 'image') {
    return createUploader('image', { subdirectory, fieldName });
  }

  static privateImage(subdirectory = 'general', fieldName = 'image') {
    return createUploader('private-image', { subdirectory, fieldName });
  }

  static excel(fieldName = DEFAULT_FIELD_NAME) {
    return createUploader('excel', { fieldName });
  }

  static word(fieldName = DEFAULT_FIELD_NAME) {
    return createUploader('word', { fieldName });
  }

  static pdf(fieldName = DEFAULT_FIELD_NAME) {
    return createUploader('pdf', { fieldName });
  }

  static csv(fieldName = DEFAULT_FIELD_NAME) {
    return createUploader('csv', { fieldName });
  }
}

module.exports = Upload;

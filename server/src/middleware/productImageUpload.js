import { randomUUID } from 'node:crypto';
import { mkdir, open, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { HttpError } from './errorHandler.js';

export const productImageDirectory = fileURLToPath(new URL('../../uploads/products/', import.meta.url));
export const profileImageDirectory = fileURLToPath(new URL('../../uploads/profiles/', import.meta.url));

const extensionByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

async function matchesImageType(file) {
  const handle = await open(file.path, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (file.mimetype === 'image/jpeg') return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    if (file.mimetype === 'image/png') return bytesRead >= 8 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return bytesRead >= 12
      && header.toString('ascii', 0, 4) === 'RIFF'
      && header.toString('ascii', 8, 12) === 'WEBP';
  } finally {
    await handle.close();
  }
}

export async function removeUploadedImageFiles(files = []) {
  await Promise.all(files.map((file) => rm(file.path, { force: true })));
}

function createImageUpload(directory, fieldName, count, label) {
  const upload = multer({
    storage: multer.diskStorage({
      destination(_request, _file, callback) {
        mkdir(directory, { recursive: true })
          .then(() => callback(null, directory), callback);
      },
      filename(_request, file, callback) {
        callback(null, `${randomUUID()}${extensionByMimeType[file.mimetype]}`);
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: count },
    fileFilter(_request, file, callback) {
      if (!Object.hasOwn(extensionByMimeType, file.mimetype)) {
        callback(new HttpError(400, `Use JPG, PNG, or WebP ${label}.`));
        return;
      }
      callback(null, true);
    }
  });

  return (request, response, next) => {
    const handler = count === 1 ? upload.single(fieldName) : upload.array(fieldName, count);
    handler(request, response, async (error) => {
      if (error) {
        try {
          await removeUploadedImageFiles(request.files || (request.file ? [request.file] : []));
        } catch (cleanupError) {
          next(cleanupError);
          return;
        }
        if (error instanceof multer.MulterError) {
          const message = error.code === 'LIMIT_FILE_SIZE'
            ? `Each ${label} must be 5 MB or smaller.`
            : `Upload ${count === 1 ? 'one' : `up to ${count}`} ${label}${count === 1 ? '' : 's'} at a time.`;
          next(new HttpError(400, message));
          return;
        }
        next(error);
        return;
      }

      const files = count === 1 ? [request.file].filter(Boolean) : request.files || [];
      try {
        const valid = await Promise.all(files.map(matchesImageType));
        if (valid.some((isValid) => !isValid)) {
          await removeUploadedImageFiles(files);
          next(new HttpError(400, 'The uploaded file content does not match its image type.'));
          return;
        }
        next();
      } catch (validationError) {
        try {
          await removeUploadedImageFiles(files);
        } catch (cleanupError) {
          next(cleanupError);
          return;
        }
        next(validationError);
      }
    });
  };
}

export const uploadProductImages = createImageUpload(productImageDirectory, 'images', 10, 'product image');
export const uploadProfileImage = createImageUpload(profileImageDirectory, 'image', 1, 'profile image');

function parseJsonField(value, label) {
  try {
    return JSON.parse(value);
  } catch {
    throw new HttpError(400, `Provide valid ${label}.`);
  }
}

export function normalizeProductFormData(request, response, next) {
  if (!request.is('multipart/form-data')) {
    next();
    return;
  }

  try {
    if (typeof request.body.sizes === 'string') {
      request.body.sizes = parseJsonField(request.body.sizes, 'size quantities');
    }

    const files = request.files || [];
    if (request.body.image_order !== undefined && typeof request.body.image_order !== 'string') {
      throw new HttpError(400, 'Provide a valid product image order.');
    }
    const order = request.body.image_order === undefined
      ? files.map((_file, index) => ({ type: 'upload', index }))
      : parseJsonField(request.body.image_order, 'product image order');
    if (!Array.isArray(order) || order.length > 10) {
      throw new HttpError(400, 'Provide a valid product image order.');
    }

    const usedFiles = new Set();
    request.body.images = order.map((image) => {
      if (image?.type === 'existing' && typeof image.value === 'string') return image.value;
      if (image?.type === 'upload' && Number.isInteger(image.index)
        && image.index >= 0 && image.index < files.length && !usedFiles.has(image.index)) {
        usedFiles.add(image.index);
        return `/uploads/products/${files[image.index].filename}`;
      }
      throw new HttpError(400, 'Provide a valid product image order.');
    });
    if (usedFiles.size !== files.length) {
      throw new HttpError(400, 'Every uploaded product image must be included in the product image order.');
    }
    delete request.body.image_order;
    next();
  } catch (error) {
    removeUploadedImageFiles(request.files || [])
      .then(() => next(error), next);
  }
}

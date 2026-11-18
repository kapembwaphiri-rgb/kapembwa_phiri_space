import { randomUUID } from 'node:crypto';
import { mkdir, open, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { HttpError } from './errorHandler.js';

export const productImageDirectory = fileURLToPath(new URL('../../uploads/products/', import.meta.url));

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

const upload = multer({
  storage: multer.diskStorage({
    destination(_request, _file, callback) {
      mkdir(productImageDirectory, { recursive: true })
        .then(() => callback(null, productImageDirectory), callback);
    },
    filename(_request, file, callback) {
      callback(null, `${randomUUID()}${extensionByMimeType[file.mimetype]}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter(_request, file, callback) {
    if (!Object.hasOwn(extensionByMimeType, file.mimetype)) {
      callback(new HttpError(400, 'Use JPG, PNG, or WebP product images.'));
      return;
    }
    callback(null, true);
  }
});

export function uploadProductImages(request, response, next) {
  upload.array('images', 10)(request, response, async (error) => {
    if (!error) {
      const files = request.files || [];
      try {
        const valid = await Promise.all(files.map(matchesImageType));
        if (valid.some((isValid) => !isValid)) {
          await Promise.all(files.map((file) => rm(file.path, { force: true })));
          next(new HttpError(400, 'The uploaded file content does not match its image type.'));
          return;
        }
        next();
      } catch (validationError) {
        next(validationError);
      }
      return;
    }
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Each product image must be 5 MB or smaller.'
        : 'Upload up to 10 product images at a time.';
      next(new HttpError(400, message));
      return;
    }
    next(error);
  });
}

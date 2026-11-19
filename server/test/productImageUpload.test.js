import assert from 'node:assert/strict';
import { once } from 'node:events';
import { rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import express from 'express';
import { errorHandler } from '../src/middleware/errorHandler.js';
import {
  productImageDirectory,
  profileImageDirectory,
  normalizeProductFormData,
  uploadProductImages,
  uploadProfileImage
} from '../src/middleware/productImageUpload.js';

async function withUploadServer(run) {
  const app = express();
  app.post('/images', uploadProductImages, (req, res) => {
    res.status(201).json({ filenames: req.files.map((file) => file.filename) });
  });
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const { port } = server.address();
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('accepts and stores a matching PNG upload', async () => {
  let uploadedPath;
  try {
    await withUploadServer(async (baseUrl) => {
      const form = new FormData();
      form.append('images', new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])], { type: 'image/png' }), 'shirt.png');
      const response = await fetch(`${baseUrl}/images`, { method: 'POST', body: form });
      const result = await response.json();
      assert.equal(response.status, 201);
      assert.equal(result.filenames.length, 1);
      uploadedPath = join(productImageDirectory, result.filenames[0]);
      assert.deepEqual(await readFile(uploadedPath), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
    });
  } finally {
    if (uploadedPath) await rm(uploadedPath, { force: true });
  }
});

test('accepts matching JPEG and WebP uploads', async () => {
  const uploads = [
    { type: 'image/jpeg', name: 'shirt.jpeg', bytes: [0xff, 0xd8, 0xff, 0x00], extension: '.jpg' },
    { type: 'image/webp', name: 'shirt.webp', bytes: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50], extension: '.webp' }
  ];
  await withUploadServer(async (baseUrl) => {
    for (const upload of uploads) {
      let uploadedPath;
      try {
        const form = new FormData();
        form.append('images', new Blob([Buffer.from(upload.bytes)], { type: upload.type }), upload.name);
        const response = await fetch(`${baseUrl}/images`, { method: 'POST', body: form });
        const result = await response.json();
        assert.equal(response.status, 201);
        assert.match(result.filenames[0], new RegExp(`${upload.extension.replace('.', '\\.')}$`));
        uploadedPath = join(productImageDirectory, result.filenames[0]);
        assert.deepEqual(await readFile(uploadedPath), Buffer.from(upload.bytes));
      } finally {
        if (uploadedPath) await rm(uploadedPath, { force: true });
      }
    }
  });
});

test('normalizes multipart product data and preserves image order', async () => {
  let uploadedPath;
  const app = express();
  app.post('/products', uploadProductImages, normalizeProductFormData, (req, res) => {
    res.status(201).json({ sizes: req.body.sizes, images: req.body.images });
  });
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const { port } = server.address();
    const form = new FormData();
    form.append('sizes', JSON.stringify([{ size: 'M', quantity: 3 }]));
    form.append('image_order', JSON.stringify([
      { type: 'existing', value: 'https://legacy.example/product.jpg' },
      { type: 'upload', index: 0 }
    ]));
    form.append('images', new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])], { type: 'image/png' }), 'shirt.png');
    const response = await fetch(`http://127.0.0.1:${port}/products`, { method: 'POST', body: form });
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.deepEqual(result.sizes, [{ size: 'M', quantity: 3 }]);
    assert.equal(result.images.length, 2);
    assert.equal(result.images[0], 'https://legacy.example/product.jpg');
    assert.match(result.images[1], /^\/uploads\/products\/[0-9a-f-]+\.png$/);
    uploadedPath = join(productImageDirectory, result.images[1].split('/').pop());
    assert.deepEqual(await readFile(uploadedPath), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
  } finally {
    if (uploadedPath) await rm(uploadedPath, { force: true });
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('rejects unsupported image formats', async () => {
  await withUploadServer(async (baseUrl) => {
    const form = new FormData();
    form.append('images', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'shirt.svg');
    const response = await fetch(`${baseUrl}/images`, { method: 'POST', body: form });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /JPG, PNG, or WebP/);
  });
});

test('rejects product image files larger than 5 MB', async () => {
  await withUploadServer(async (baseUrl) => {
    const form = new FormData();
    const bytes = new Uint8Array(5 * 1024 * 1024 + 1);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    form.append('images', new Blob([bytes], { type: 'image/png' }), 'shirt.png');
    const response = await fetch(`${baseUrl}/images`, { method: 'POST', body: form });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /5 MB or smaller/);
  });
});

test('rejects image files whose contents do not match their declared type', async () => {
  await withUploadServer(async (baseUrl) => {
    const form = new FormData();
    form.append('images', new Blob(['not a png'], { type: 'image/png' }), 'shirt.png');
    const response = await fetch(`${baseUrl}/images`, { method: 'POST', body: form });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /does not match its image type/);
  });
});

test('accepts and stores a matching profile photo', async () => {
  const app = express();
  app.post('/profile', uploadProfileImage, (req, res) => {
    res.status(201).json({ filename: req.file.filename });
  });
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  let uploadedPath;
  try {
    const { port } = server.address();
    const form = new FormData();
    const imageBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    form.append('image', new Blob([imageBytes], { type: 'image/png' }), 'profile.png');
    const response = await fetch(`http://127.0.0.1:${port}/profile`, { method: 'POST', body: form });
    const result = await response.json();
    assert.equal(response.status, 201);
    uploadedPath = join(profileImageDirectory, result.filename);
    assert.deepEqual(await readFile(uploadedPath), imageBytes);
  } finally {
    if (uploadedPath) await rm(uploadedPath, { force: true });
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

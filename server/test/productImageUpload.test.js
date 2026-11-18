import assert from 'node:assert/strict';
import { once } from 'node:events';
import { rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import express from 'express';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { productImageDirectory, uploadProductImages } from '../src/middleware/productImageUpload.js';

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

test('rejects unsupported image formats', async () => {
  await withUploadServer(async (baseUrl) => {
    const form = new FormData();
    form.append('images', new Blob(['<svg/>'], { type: 'image/svg+xml' }), 'shirt.svg');
    const response = await fetch(`${baseUrl}/images`, { method: 'POST', body: form });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /JPG, PNG, or WebP/);
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

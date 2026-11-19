const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

function isFormData(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, new URL(API_URL).origin).href;
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const formDataBody = isFormData(options.body);
  const token = typeof window === 'undefined' ? null : localStorage.getItem('pos_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined && !formDataBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined
      ? undefined
      : formDataBody
        ? options.body
        : typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body)
  });
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`The API returned an unexpected response (${response.status}).`);
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `The request failed (${response.status}).`);
  }
  return data;
}

function queryString(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

function createCartId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getCartId() {
  let cartId = localStorage.getItem('pos_cart_id');
  if (!cartId) {
    cartId = createCartId();
    localStorage.setItem('pos_cart_id', cartId);
  }
  return cartId;
}

function uploadFormData(path, body, onProgress, method = 'POST') {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const token = localStorage.getItem('pos_token');
    request.open(method, `${API_URL}${path}`);
    if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener('error', () => reject(new Error('The upload could not reach the API.')));
    request.addEventListener('abort', () => reject(new Error('The upload was cancelled.')));
    request.addEventListener('load', () => {
      const contentType = request.getResponseHeader('content-type') || '';
      if (!contentType.includes('application/json')) {
        reject(new Error(`The upload returned an unexpected response (${request.status}).`));
        return;
      }
      let data;
      try {
        data = JSON.parse(request.responseText);
      } catch {
        reject(new Error('The upload returned an invalid response.'));
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(data.error || `The upload failed (${request.status}).`));
        return;
      }
      resolve(data);
    });
    request.send(body);
  });
}

async function uploadProductImages(files, onProgress) {
  const body = new FormData();
  for (const file of files) body.append('images', file);
  const data = await uploadFormData('/products/images', body, onProgress);
  return data.images.map(assetUrl);
}

async function uploadProfilePhoto(file, onProgress) {
  const body = new FormData();
  body.append('image', file);
  return uploadFormData('/auth/profile/photo', body, onProgress);
}

export const productApi = {
  list: (filters = {}) => api(`/products${queryString(filters)}`),
  get: (id) => api(`/products/${encodeURIComponent(id)}`),
  uploadImages: uploadProductImages,
  create: (product, onProgress) => isFormData(product)
    ? uploadFormData('/products', product, onProgress)
    : api('/products', { method: 'POST', body: product }),
  update: (id, changes, onProgress) => isFormData(changes)
    ? uploadFormData(`/products/${encodeURIComponent(id)}`, changes, onProgress, 'PUT')
    : api(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: changes }),
  remove: (id) => api(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' })
};

export const cartApi = {
  get: (cartId = getCartId()) => api(`/cart${queryString({ cartId })}`),
  add: (productId, quantity = 1, cartId = getCartId(), size = 'ONE_SIZE') => api('/cart/add', {
    method: 'POST',
    body: { cartId, productId, quantity, size }
  }),
  update: (productId, quantity, cartId = getCartId(), size = 'ONE_SIZE') => api('/cart/update', {
    method: 'PUT',
    body: { cartId, productId, quantity, size }
  }),
  remove: (productId, cartId = getCartId(), size = 'ONE_SIZE') => api('/cart/remove', {
    method: 'DELETE',
    body: { cartId, productId, size }
  }),
  clear: (cartId = getCartId()) => api('/cart', {
    method: 'DELETE',
    body: { cartId }
  })
};

export const orderApi = {
  checkout: (order) => api('/orders/checkout', { method: 'POST', body: order }),
  get: (id) => api(`/orders/${encodeURIComponent(id)}`)
};

export const salesApi = {
  create: (sale) => api('/sales', { method: 'POST', body: sale }),
  createReturn: (returnRequest) => api('/returns', { method: 'POST', body: returnRequest })
};

export const authApi = {
  login: (credentials) => api('/auth/login', { method: 'POST', body: credentials }),
  register: (credentials) => api('/auth/register', { method: 'POST', body: credentials }),
  profile: () => api('/auth/profile'),
  updateProfile: (changes) => api('/auth/profile', { method: 'PUT', body: changes }),
  uploadProfilePhoto,
  changePassword: (credentials) => api('/auth/change-password', { method: 'POST', body: credentials })
};

export const customerOrderApi = {
  list: () => api('/orders')
};
export const reportApi = {
  getSummary: () => api('/reports/summary'),
  getDashboard: (range = '7d') => api(`/reports/dashboard${queryString({ range })}`)
};

export function queueSale(payload) {
  const queue = JSON.parse(localStorage.getItem('pos_queue') || '[]');
  if (!Array.isArray(queue)) throw new Error('The saved offline sale queue is invalid.');
  queue.push(payload);
  localStorage.setItem('pos_queue', JSON.stringify(queue));
}

export function queuedCount() {
  const queue = JSON.parse(localStorage.getItem('pos_queue') || '[]');
  if (!Array.isArray(queue)) throw new Error('The saved offline sale queue is invalid.');
  return queue.length;
}

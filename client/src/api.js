// Thin fetch wrapper. All calls go to the same origin under /api, which Vite
// (dev) or nginx (prod) proxies to the API server.
const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: () => request('/auth/me', { auth: true }),

  listProducts: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v)
    ).toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (payload) => request('/products', { method: 'POST', body: payload, auth: true }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE', auth: true }),

  listReviews: (productId) => request(`/products/${productId}/reviews`),
  addReview: (productId, payload) =>
    request(`/products/${productId}/reviews`, { method: 'POST', body: payload, auth: true }),
  deleteReview: (productId, reviewId) =>
    request(`/products/${productId}/reviews/${reviewId}`, { method: 'DELETE', auth: true }),
  getSummary: (productId) => request(`/products/${productId}/reviews/summary`),
};

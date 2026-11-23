/**
 * Single API client for the Next.js app.
 *
 * Every call goes to the Express API at NEXT_PUBLIC_API_URL. The value is
 * inlined at build time; configure it before running `next build`. If it is
 * missing, requests fail with a clear configuration error instead of silently
 * showing mock data.
 */
import { TOKEN_KEY } from './constants';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

export const isConfigured = Boolean(API_URL);
export const apiBaseUrl = API_URL || null;

const isBrowser = typeof window !== 'undefined';
const getToken = () => (isBrowser ? localStorage.getItem(TOKEN_KEY) : null);

const ensureConfigured = () => {
  if (!API_URL) {
    throw new Error('Backend is not configured. Set NEXT_PUBLIC_API_URL and rebuild the client.');
  }
};

/** Fetch and parse JSON, with a clear error when the response is not JSON. */
const request = async (path, options = {}) => {
  ensureConfigured();

  const token = getToken();
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Cannot reach the API at ${API_URL}`);
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`API returned a non-JSON response (${response.status})`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
};

const jsonBody = (method, payload) => ({
  method,
  body: JSON.stringify(payload),
});

export const api = {
  isConfigured,
  apiBaseUrl,

  // --- Authentication -------------------------------------------------------
  login: async (email, password) => {
    const result = await request('/auth/login', jsonBody('POST', { email, password }));
    if (isBrowser && result.token) localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },

  register: async (payload) => {
    const result = await request('/auth/register', jsonBody('POST', payload));
    if (isBrowser && result.token) localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },

  /** A stale token must clear the session, never restore an assumed identity. */
  getMe: () => request('/auth/me'),

  logout: () => {
    if (isBrowser) localStorage.removeItem(TOKEN_KEY);
  },

  // --- Dashboard ------------------------------------------------------------
  getDashboard: () => request('/dashboard'),

  // --- Invoices -------------------------------------------------------------
  getInvoices: () => request('/invoices'),
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (payload) => request('/invoices', jsonBody('POST', payload)),
  runAudit: (id) => request(`/invoices/${id}/audit`, { method: 'POST' }),

  // --- Contracts ------------------------------------------------------------
  getContracts: () => request('/contracts'),
  createContract: (payload) => request('/contracts', jsonBody('POST', payload)),

  // --- Admin panel ----------------------------------------------------------
  getAdminStats: () => request('/admin/stats'),
  getReviewQueue: () => request('/admin/review-queue'),
  reviewLine: (id, payload) => request(`/admin/review/${id}`, jsonBody('PUT', payload)),
  getUsers: () => request('/admin/users'),
  updateUser: (id, payload) => request(`/admin/users/${id}`, jsonBody('PUT', payload)),
  getAllInvoices: () => request('/admin/invoices'),
  getAllDisputes: () => request('/admin/disputes'),
  getSettings: () => request('/admin/settings'),
};

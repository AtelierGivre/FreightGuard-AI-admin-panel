/**
 * Single API client for the Next.js app.
 *
 * Real mode calls the Express API at NEXT_PUBLIC_API_URL. Preview mode is a
 * TEMPORARY opt-in (NEXT_PUBLIC_PREVIEW_MODE=true) that serves sample data so
 * the UI can be reviewed while the backend is being prepared. Preview mode
 * never calls the API and must be removed when the live API is connected.
 */
import * as preview from './previewData';
import { DEFAULT_FEE_PCT, TOKEN_KEY } from './constants';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const PREVIEW_MODE = process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true';

export const isPreview = PREVIEW_MODE;
export const isConfigured = Boolean(API_URL);
export const apiBaseUrl = API_URL || null;

const isBrowser = typeof window !== 'undefined';
const getToken = () => (isBrowser ? localStorage.getItem(TOKEN_KEY) : null);

const ensureConfigured = () => {
  if (!API_URL && !PREVIEW_MODE) {
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

/** Temporary preview branch; no HTTP fallback is applied in real mode. */
const withPreview = async (previewValue, path, options) => {
  if (PREVIEW_MODE) return { success: true, data: previewValue };
  return request(path, options);
};

const jsonBody = (method, payload) => ({
  method,
  body: JSON.stringify(payload),
});

export const api = {
  isPreview,
  isConfigured,
  apiBaseUrl,

  // --- Authentication -------------------------------------------------------
  login: async (email, password) => {
    if (PREVIEW_MODE) {
      if (isBrowser) localStorage.setItem(TOKEN_KEY, 'preview-token');
      return { success: true, token: 'preview-token', user: preview.demoUser };
    }
    const result = await request('/auth/login', jsonBody('POST', { email, password }));
    if (isBrowser && result.token) localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },

  register: async (payload) => {
    if (PREVIEW_MODE) {
      if (isBrowser) localStorage.setItem(TOKEN_KEY, 'preview-token');
      return { success: true, token: 'preview-token', user: preview.demoUser };
    }
    const result = await request('/auth/register', jsonBody('POST', payload));
    if (isBrowser && result.token) localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },

  /** In preview mode a stored token resolves to the sample admin identity. */
  getMe: () =>
    PREVIEW_MODE ? Promise.resolve({ success: true, user: preview.demoUser }) : request('/auth/me'),

  logout: () => {
    if (isBrowser) localStorage.removeItem(TOKEN_KEY);
  },

  // --- Dashboard ------------------------------------------------------------
  getDashboard: () => withPreview(preview.dashboardData, '/dashboard'),

  // --- Invoices -------------------------------------------------------------
  getInvoices: () => withPreview(preview.invoices, '/invoices'),
  getInvoice: (id) =>
    withPreview(
      (() => {
        const invoice = preview.invoices.find((item) => item._id === id);
        return invoice
          ? { ...invoice, lines: preview.invoiceLines.filter((line) => line.invoice === id) }
          : null;
      })(),
      `/invoices/${id}`,
    ),
  createInvoice: (payload) =>
    withPreview(
      (() => {
        const created = { _id: `inv-${Date.now()}`, ...payload };
        preview.invoices.unshift(created);
        return created;
      })(),
      '/invoices',
      jsonBody('POST', payload),
    ),
  runAudit: (id) =>
    withPreview(
      preview.invoiceLines.filter((line) => line.invoice === id),
      `/invoices/${id}/audit`,
      { method: 'POST' },
    ),

  // --- Contracts ------------------------------------------------------------
  getContracts: () => withPreview(preview.contracts, '/contracts'),
  createContract: (payload) =>
    withPreview(
      (() => {
        const created = { _id: `c-${Date.now()}`, ...payload };
        preview.contracts.unshift(created);
        return created;
      })(),
      '/contracts',
      jsonBody('POST', payload),
    ),

  // --- Admin panel ----------------------------------------------------------
  getAdminStats: () => withPreview(preview.adminStats, '/admin/stats'),
  getReviewQueue: () =>
    withPreview(
      preview.invoiceLines.filter((line) => line.reviewStatus === 'unreviewed'),
      '/admin/review-queue',
    ),
  reviewLine: (id, payload) =>
    withPreview(
      (() => {
        const line = preview.invoiceLines.find((item) => item._id === id);
        if (line) Object.assign(line, payload, { reviewStatus: payload.reviewStatus });
        return { _id: id, ...payload };
      })(),
      `/admin/review/${id}`,
      jsonBody('PUT', payload),
    ),
  getUsers: () => withPreview(preview.users, '/admin/users'),
  updateUser: (id, payload) =>
    withPreview(
      (() => {
        const user = preview.users.find((item) => item._id === id);
        if (user) Object.assign(user, payload);
        return { _id: id, ...payload };
      })(),
      `/admin/users/${id}`,
      jsonBody('PUT', payload),
    ),
  getAllInvoices: () => withPreview(preview.invoices, '/admin/invoices'),
  getAllDisputes: () => withPreview(preview.disputes, '/admin/disputes'),
  getSettings: () =>
    withPreview(
      {
        defaultFeePct: DEFAULT_FEE_PCT,
        companies: [
          { id: 'preview-co', name: 'Harborline Imports', feePct: DEFAULT_FEE_PCT, plan: 'free' },
        ],
      },
      '/admin/settings',
    ),
};

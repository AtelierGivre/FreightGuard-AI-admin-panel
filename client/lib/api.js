/**
 * Single API client for the Next.js app.
 *
 * Modes:
 *  - Demo (NEXT_PUBLIC_API_URL unset): all calls are served from `demoData`.
 *  - Live: real HTTP calls to the Express API.
 *  - Live + fallback (NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=true): failed calls fall
 *    back to demo data. Intended for local development with no database; never
 *    enable it in production or the UI could silently display mock numbers.
 */
import * as demo from './demoData';
import { DEFAULT_FEE_PCT, TOKEN_KEY } from './constants';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
export const isDemo = !API_URL;
export const allowsFallback = isDemo || process.env.NEXT_PUBLIC_ALLOW_DEMO_FALLBACK === 'true';

const isBrowser = typeof window !== 'undefined';
const getToken = () => (isBrowser ? localStorage.getItem(TOKEN_KEY) : null);

/** Fetch and parse JSON, with a clear error when the response is not JSON. */
const request = async (path, options = {}) => {
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
    throw new Error(`Cannot reach the API at ${API_URL || '(not configured)'}`);
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

/** Use demo data in demo mode; optionally fall back on failure during development. */
const withDemo = async (demoValue, path, options) => {
  if (isDemo) return { success: true, data: demoValue };

  try {
    return await request(path, options);
  } catch (error) {
    if (!allowsFallback) throw error;
    console.warn(`[api] ${path} failed (${error.message}) — showing demo data`);
    return { success: true, data: demoValue, demo: true };
  }
};

const jsonBody = (method, payload) => ({
  method,
  body: JSON.stringify(payload),
});

export const api = {
  isDemo,
  allowsFallback,

  // --- Authentication -------------------------------------------------------
  login: async (email, password) => {
    if (isDemo) {
      if (isBrowser) localStorage.setItem(TOKEN_KEY, 'demo-token');
      return { success: true, token: 'demo-token', user: demo.demoUser };
    }
    const result = await request('/auth/login', jsonBody('POST', { email, password }));
    if (isBrowser && result.token) localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },

  register: async (payload) => {
    if (isDemo) {
      if (isBrowser) localStorage.setItem(TOKEN_KEY, 'demo-token');
      return { success: true, token: 'demo-token', user: demo.demoUser };
    }
    const result = await request('/auth/register', jsonBody('POST', payload));
    if (isBrowser && result.token) localStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },

  /** Never silently fall back here: a stale token must be cleared, not replaced by a demo admin. */
  getMe: () =>
    isDemo ? Promise.resolve({ success: true, user: demo.demoUser }) : request('/auth/me'),

  logout: () => {
    if (isBrowser) localStorage.removeItem(TOKEN_KEY);
  },

  // --- Dashboard ------------------------------------------------------------
  getDashboard: () => withDemo(demo.dashboardData, '/dashboard'),

  // --- Invoices -------------------------------------------------------------
  getInvoices: () => withDemo(demo.invoices, '/invoices'),
  getInvoice: (id) =>
    withDemo(
      (() => {
        const invoice = demo.invoices.find((item) => item._id === id);
        return invoice
          ? { ...invoice, lines: demo.invoiceLines.filter((line) => line.invoice === id) }
          : null;
      })(),
      `/invoices/${id}`,
    ),
  createInvoice: (payload) =>
    withDemo(
      (() => {
        const created = { _id: `inv-${Date.now()}`, ...payload };
        demo.invoices.unshift(created);
        return created;
      })(),
      '/invoices',
      jsonBody('POST', payload),
    ),
  runAudit: (id) =>
    withDemo(
      demo.invoiceLines.filter((line) => line.invoice === id),
      `/invoices/${id}/audit`,
      {
        method: 'POST',
      },
    ),

  // --- Contracts ------------------------------------------------------------
  getContracts: () => withDemo(demo.contracts, '/contracts'),
  createContract: (payload) =>
    withDemo(
      (() => {
        const created = { _id: `c-${Date.now()}`, ...payload };
        demo.contracts.unshift(created);
        return created;
      })(),
      '/contracts',
      jsonBody('POST', payload),
    ),

  // --- Admin panel ----------------------------------------------------------
  getAdminStats: () => withDemo(demo.adminStats, '/admin/stats'),
  getReviewQueue: () =>
    withDemo(
      demo.invoiceLines.filter((line) => line.reviewStatus === 'unreviewed'),
      '/admin/review-queue',
    ),
  reviewLine: (id, payload) =>
    withDemo(
      (() => {
        const line = demo.invoiceLines.find((item) => item._id === id);
        if (line) Object.assign(line, payload, { reviewStatus: payload.reviewStatus });
        return { _id: id, ...payload };
      })(),
      `/admin/review/${id}`,
      jsonBody('PUT', payload),
    ),
  getUsers: () => withDemo(demo.users, '/admin/users'),
  updateUser: (id, payload) =>
    withDemo(
      (() => {
        const user = demo.users.find((item) => item._id === id);
        if (user) Object.assign(user, payload);
        return { _id: id, ...payload };
      })(),
      `/admin/users/${id}`,
      jsonBody('PUT', payload),
    ),
  getAllInvoices: () => withDemo(demo.invoices, '/admin/invoices'),
  getAllDisputes: () => withDemo(demo.disputes, '/admin/disputes'),
  getSettings: () =>
    withDemo(
      {
        defaultFeePct: DEFAULT_FEE_PCT,
        companies: [
          { id: 'demo-co', name: 'Harborline Imports', feePct: DEFAULT_FEE_PCT, plan: 'free' },
        ],
      },
      '/admin/settings',
    ),
};

/**
 * Single API client for the Next.js app.
 *
 * Real mode calls the Express API at NEXT_PUBLIC_API_URL. Preview mode is an
 * opt-in development aid that serves sample data without calling the API.
 * It is hard blocked in production builds and on non-development origins.
 */
import * as preview from './previewData';
import { DEFAULT_FEE_PCT, TOKEN_KEY } from './constants';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const isBrowser = typeof window !== 'undefined';
const PREVIEW_ORIGINS = (
  process.env.NEXT_PUBLIC_PREVIEW_ALLOWED_ORIGINS || 'localhost:3000,127.0.0.1:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// NEXT_PUBLIC_* values are frozen at build time. The extra NODE_ENV and origin
// checks stop a mis-set flag from exposing fake admin data on a public deploy.
const PREVIEW_MODE =
  process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true' &&
  process.env.NODE_ENV !== 'production' &&
  (!isBrowser || PREVIEW_ORIGINS.includes(window.location.host));

export const isPreview = PREVIEW_MODE;
export const isConfigured = Boolean(API_URL);
export const apiBaseUrl = API_URL || null;

const getToken = () => (isBrowser ? localStorage.getItem(TOKEN_KEY) : null);

const withQuery = (path, params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

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
const withPreview = async (previewValueOrFactory, path, options) => {
  if (PREVIEW_MODE) {
    const previewValue =
      typeof previewValueOrFactory === 'function' ? previewValueOrFactory() : previewValueOrFactory;
    return { success: true, data: previewValue };
  }
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
  getInvoices: (params) => withPreview(preview.invoices, withQuery('/invoices', params)),
  getInvoice: (id) =>
    withPreview(() => {
      const invoice = preview.invoices.find((item) => item._id === id);
      return invoice
        ? { ...invoice, lines: preview.invoiceLines.filter((line) => line.invoice === id) }
        : null;
    }, `/invoices/${id}`),
  createInvoice: (payload) =>
    withPreview(
      () => {
        const created = { _id: `inv-${Date.now()}`, ...payload };
        preview.invoices.unshift(created);
        return created;
      },
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
      () => {
        const created = { _id: `c-${Date.now()}`, ...payload };
        preview.contracts.unshift(created);
        return created;
      },
      '/contracts',
      jsonBody('POST', payload),
    ),

  // --- Admin panel ----------------------------------------------------------
  getAdminStats: () => withPreview(preview.adminStats, '/admin/stats'),
  getReviewQueue: (params) =>
    withPreview(
      preview.invoiceLines.filter((line) => line.reviewStatus === 'unreviewed'),
      withQuery('/admin/review-queue', params),
    ),
  reviewLine: (id, payload) =>
    withPreview(
      () => {
        const line = preview.invoiceLines.find((item) => item._id === id);
        if (line) Object.assign(line, payload, { reviewStatus: payload.reviewStatus });
        return { _id: id, ...payload };
      },
      `/admin/review/${id}`,
      jsonBody('PUT', payload),
    ),
  getUsers: (params) => withPreview(preview.users, withQuery('/admin/users', params)),
  updateUser: (id, payload) =>
    withPreview(
      () => {
        const user = preview.users.find((item) => item._id === id);
        if (user) Object.assign(user, payload);
        return { _id: id, ...payload };
      },
      `/admin/users/${id}`,
      jsonBody('PUT', payload),
    ),
  getAllInvoices: (params) => withPreview(preview.invoices, withQuery('/admin/invoices', params)),
  getAllDisputes: (params) => withPreview(preview.disputes, withQuery('/admin/disputes', params)),
  getSettings: (params) =>
    withPreview(
      {
        defaultFeePct: DEFAULT_FEE_PCT,
        companies: [
          { id: 'preview-co', name: 'Harborline Imports', feePct: DEFAULT_FEE_PCT, plan: 'free' },
        ],
      },
      withQuery('/admin/settings', params),
    ),

  // --- Flag accept / reject -------------------------------------------------
  reviewFlag: (invoiceId, lineId, payload) =>
    withPreview(
      () => {
        const line = preview.invoiceLines.find((item) => item._id === lineId);
        if (line) {
          Object.assign(line, payload, {
            reviewStatus: payload.decision === 'accept' ? 'confirmed' : 'rejected',
            reviewedAt: new Date().toISOString(),
          });
        }
        return line || { _id: lineId, ...payload };
      },
      `/invoices/${invoiceId}/lines/${lineId}/decision`,
      jsonBody('PUT', payload),
    ),

  // --- Disputes -------------------------------------------------------------
  getDisputes: (params) => withPreview(preview.disputes, withQuery('/disputes', params)),
  getDispute: (id) =>
    withPreview(preview.disputes.find((item) => item._id === id) || null, `/disputes/${id}`),
  createDispute: (payload) =>
    withPreview(
      () => {
        const created = { _id: `d-${Date.now()}`, status: 'draft', ...payload };
        preview.disputes.unshift(created);
        return created;
      },
      '/disputes',
      jsonBody('POST', payload),
    ),
  generateDisputeLetter: (payload) =>
    withPreview(
      () => {
        const invoice = preview.invoices.find((item) => item._id === payload.invoiceId);
        const lines = preview.invoiceLines.filter(
          (line) =>
            line.invoice === payload.invoiceId &&
            line.reviewStatus === 'confirmed' &&
            ['overcharged', 'invalid'].includes(line.verdict),
        );
        const total = lines.reduce(
          (sum, line) => sum + (line.billedAmount || 0) - (line.correctAmount || 0),
          0,
        );
        const letterText = [
          'DISPUTE LETTER — DEMURRAGE / DETENTION CHARGES',
          '',
          `Re: Invoice ${invoice?.invoiceNumber || 'N/A'}`,
          '',
          ...lines.map(
            (line) =>
              `- ${line.description || line.feeType}: billed ${line.billedAmount || 0}, ` +
              `correct ${line.correctAmount || 0}. Reason: ${line.reason || 'Charge disputed'}`,
          ),
          '',
          `Total amount claimed: ${total} ${invoice?.currency || 'USD'}`,
        ].join('\n');
        const dispute = preview.disputes.find(
          (item) => item.invoice === payload.invoiceId && item.status === 'draft',
        );
        if (dispute) {
          dispute.letterText = letterText;
          dispute.disputedAmount = total;
        }
        return { dispute: dispute || null, letterText, flags: lines };
      },
      '/disputes/letters',
      jsonBody('POST', payload),
    ),
  updateDisputeStatus: (id, payload) =>
    withPreview(
      () => {
        const dispute = preview.disputes.find((item) => item._id === id);
        if (dispute) Object.assign(dispute, payload);
        return { _id: id, ...payload };
      },
      `/disputes/${id}/status`,
      jsonBody('PUT', payload),
    ),
  recordRecovery: (id, payload) =>
    withPreview(
      () => {
        const amount = Number(payload.amount) || 0;
        const feeAmount =
          Math.round(((amount * DEFAULT_FEE_PCT) / 100 + Number.EPSILON) * 100) / 100;
        const recovery = {
          _id: `r-${Date.now()}`,
          dispute: { _id: id },
          amount,
          feePct: DEFAULT_FEE_PCT,
          feeAmount,
          recoveredAt: payload.recoveredAt || new Date().toISOString(),
          billingStatus: 'due',
        };
        preview.recoveries.unshift(recovery);
        const dispute = preview.disputes.find((item) => item._id === id);
        if (dispute) dispute.status = 'won';
        return recovery;
      },
      `/disputes/${id}/recovery`,
      jsonBody('POST', payload),
    ),

  // --- Recoveries / fee billing --------------------------------------------
  getRecoveries: (params) => withPreview(preview.recoveries, withQuery('/recoveries', params)),
  getRecoveryForDispute: (disputeId) =>
    withPreview(
      preview.recoveries.find(
        (item) => String(item.dispute?._id || item.dispute) === String(disputeId),
      ) || null,
      `/recoveries/dispute/${disputeId}`,
    ),
  updateRecoveryBilling: (id, payload) =>
    withPreview(
      () => {
        const recovery = preview.recoveries.find((item) => item._id === id);
        if (recovery) Object.assign(recovery, payload);
        return { _id: id, ...payload };
      },
      `/recoveries/${id}/billing`,
      jsonBody('PUT', payload),
    ),
};

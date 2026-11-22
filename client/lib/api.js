import * as demo from './demoData';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const DEMO = !API_URL;

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('fg_token') : null);

const request = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.message || 'Request failed');
  return data;
};

const fallback = async (demoValue, path, options) => {
  if (DEMO) return { success: true, data: demoValue };
  try {
    return await request(path, options);
  } catch (err) {
    console.warn(`[api] ${path} failed (${err.message}) — using demo data`);
    return { success: true, data: demoValue, demo: true };
  }
};

export const api = {
  isDemo: DEMO,

  // Auth
  login: async (email, password) => {
    if (DEMO) return { success: true, token: 'demo-token', user: demo.demoUser };
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (typeof window !== 'undefined') localStorage.setItem('fg_token', data.token);
    return data;
  },
  register: async (payload) => {
    if (DEMO) return { success: true, token: 'demo-token', user: demo.demoUser };
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    if (typeof window !== 'undefined') localStorage.setItem('fg_token', data.token);
    return data;
  },
  getMe: () => fallback(demo.demoUser, '/auth/me'),
  logout: () => { if (typeof window !== 'undefined') localStorage.removeItem('fg_token'); },

  // Dashboard
  getDashboard: () => fallback(demo.dashboardData, '/dashboard'),

  // Invoices
  getInvoices: () => fallback(demo.invoices, '/invoices'),
  getInvoice: (id) => fallback(demo.invoices.find((i) => i._id === id), `/invoices/${id}`),
  createInvoice: (payload) => fallback({ _id: `inv-${Date.now()}`, ...payload }, '/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  runAudit: (id) => fallback(demo.invoiceLines.filter((l) => l.invoice === id), `/invoices/${id}/audit`, { method: 'POST' }),

  // Contracts
  getContracts: () => fallback(demo.contracts, '/contracts'),
  createContract: (payload) => fallback({ _id: `c-${Date.now()}`, ...payload }, '/contracts', { method: 'POST', body: JSON.stringify(payload) }),

  // Admin panel
  getAdminStats: () => fallback(demo.adminStats, '/admin/stats'),
  getReviewQueue: () => fallback(demo.invoiceLines.filter((l) => l.reviewStatus === 'unreviewed'), '/admin/review-queue'),
  reviewLine: (id, payload) => fallback({ _id: id, ...payload }, `/admin/review/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getUsers: () => fallback(demo.users, '/admin/users'),
  updateUser: (id, payload) => fallback({ _id: id, ...payload }, `/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getAllInvoices: () => fallback(demo.invoices, '/admin/invoices'),
  getAllDisputes: () => fallback(demo.disputes, '/admin/disputes'),
  getSettings: () => fallback({ defaultFeePct: 25, companies: [{ id: 'demo-co', name: 'Harborline Imports', feePct: 25, plan: 'free' }] }, '/admin/settings'),
};

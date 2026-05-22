import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      // Don't redirect if we're on login/register pages
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register') {
        isRedirecting = true;
        localStorage.removeItem('token');
        window.location.href = '/login';
        // Reset after redirect
        setTimeout(() => { isRedirecting = false }, 2000);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', new URLSearchParams(data)),
  register: (data: { email: string; password: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const transactionsApi = {
  getTransactions: () => cached('txns', () => api.get('/transactions/'), 15000),
  addTransaction: (data: any) => api.post('/transactions/add', data).then(r => { clearCache(); return r; }),
  uploadCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/transactions/upload', formData);
  },
  syncGmail: () => api.post('/transactions/sync-gmail').then(r => { clearCache(); return r; }),
  deleteTransaction: (id: number) => api.delete(`/transactions/${id}`).then(r => { clearCache(); return r; }),
  uploadBankStatement: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/transactions/upload-bank-statement', formData).then(r => { clearCache(); return r; });
  },
};

export const smsApi = {
  parse: (sms_text: string) => api.post('/sms/parse', { sms_text }),
};

export const googleAuthApi = {
  getLoginUrl: () => api.get('/auth/google/login'),
  getStatus: () => api.get('/auth/google/status'),
};

export const aiApi = {
  query: (query: string) => api.post('/ai/query', { query }),
};

export const plaidApi = {
  createLinkToken: () => api.post('/plaid/create-link-token'),
  exchangeToken: (public_token: string) =>
    api.post('/plaid/exchange-token', { public_token }),
};

export const setuApi = {
  createConsent: (mobile_number: string) =>
    api.post('/setu/create-consent', { mobile_number }),
  checkStatus: (consentId: string) =>
    api.get(`/setu/consent-status/${consentId}`),
  fetchData: (consentId: string) =>
    api.post(`/setu/fetch-data/${consentId}`),
};

export const receiptApi = {
  scan: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/receipts/scan', fd);
  },
  scanAndSave: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/receipts/scan-and-save', fd).then(r => { clearCache(); return r; });
  },
};

export const budgetApi = {
  getAll: () => api.get('/budgets/'),
  getStatus: () => api.get('/budgets/status'),
  create: (data: { category: string; amount_limit: number; period?: string }) =>
    api.post('/budgets/', data),
  update: (id: number, data: { amount_limit?: number; is_active?: boolean }) =>
    api.patch(`/budgets/${id}`, data),
  delete: (id: number) => api.delete(`/budgets/${id}`),
};

// Simple in-memory cache to avoid duplicate API calls
const _cache: Record<string, { data: any; ts: number }> = {};
function cached(key: string, fetcher: () => Promise<any>, ttlMs = 30000) {
  const now = Date.now();
  if (_cache[key] && now - _cache[key].ts < ttlMs) {
    return Promise.resolve(_cache[key].data);
  }
  return fetcher().then(res => {
    _cache[key] = { data: res, ts: now };
    return res;
  });
}
export function clearCache() { Object.keys(_cache).forEach(k => delete _cache[k]); }

export const analyticsApi = {
  getSummary: () => cached('summary', () => api.get('/analytics/summary')),
  getInsights: () => cached('insights', () => api.get('/analytics/insights')),
  getSubscriptions: () => cached('subs', () => api.get('/analytics/subscriptions')),
  getHealthScore: () => cached('health', () => api.get('/analytics/health-score')),
  getPredictions: () => cached('predictions', () => api.get('/analytics/predictions')),
  getWeeklyDigest: () => cached('digest', () => api.get('/analytics/weekly-digest')),
};

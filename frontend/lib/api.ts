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
  getTransactions: () => api.get('/transactions/'),
  addTransaction: (data: any) => api.post('/transactions/add', data),
  uploadCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/transactions/upload', formData);
  },
  syncGmail: () => api.post('/transactions/sync-gmail'),
  deleteTransaction: (id: number) => api.delete(`/transactions/${id}`),
  uploadBankStatement: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/transactions/upload-bank-statement', formData);
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

export const analyticsApi = {
  getSummary: () => api.get('/analytics/summary'),
  getInsights: () => api.get('/analytics/insights'),
  getSubscriptions: () => api.get('/analytics/subscriptions'),
};

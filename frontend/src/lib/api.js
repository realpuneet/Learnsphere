import axios from 'axios';
import { useAuth } from './authStore.js';

const base = `${import.meta.env.VITE_API_URL || ''}/api/v1`;

export const api = axios.create({ baseURL: base, withCredentials: true, timeout: 20000 });

api.interceptors.request.use((config) => {
  const t = useAuth.getState().accessToken;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

let refreshing = null;
export function refreshSession() {
  // single-flight: concurrent 401s share one refresh call
  if (!refreshing) {
    refreshing = axios
      .post(`${base}/auth/refresh`, null, { withCredentials: true })
      .then((r) => {
        useAuth.getState().setSession(r.data.data);
        return r.data.data.accessToken;
      })
      .finally(() => (refreshing = null));
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res.data, // -> { success, message, data, meta }
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.code;
    if (status === 401 && original && !original._retry && !original.url?.includes('/auth/') && code !== 'ACCOUNT_INACTIVE') {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        useAuth.getState().clear();
      }
    }
    error.userMessage =
      error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'Request timed out' : error.message === 'Network Error' ? 'You appear to be offline' : 'Something went wrong');
    error.apiCode = code;
    return Promise.reject(error);
  },
);

/** Convenience wrappers returning { data, meta } */
export const get = (url, params, config) => api.get(url, { params, ...config });
export const post = (url, body, config) => api.post(url, body, config);
export const put = (url, body, config) => api.put(url, body, config);
export const patch = (url, body, config) => api.patch(url, body, config);
export const del = (url, config) => api.delete(url, config);

export const idemKey = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());

import axios from 'axios';

const isBrowser = typeof window !== 'undefined';

const getBaseURL = () => {
  if (isBrowser) {
    // If loaded on a localtunnel address, dynamically route API requests to public backend URL
    if (window.location.hostname.endsWith('loca.lt')) {
      return 'https://sour-rooms-slide.loca.lt/api';
    }
    // If accessing frontend directly on port 3000 during dev, bypass proxy and route to backend port 5000
    if (window.location.port === '3000') {
      return 'http://localhost:5000/api';
    }
    return '/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    if (isBrowser) {
      const token = localStorage.getItem('sm_access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: JWT Rotation on expiry (403/401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      isBrowser &&
      error.response &&
      (error.response.status === 401 || error.response.status === 403) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('sm_refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token stored');
        }

        // Avoid utilizing interceptors for refresh request to prevent loops
        const res = await axios.post(`${getBaseURL()}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data;

        localStorage.setItem('sm_access_token', accessToken);
        localStorage.setItem('sm_refresh_token', newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (err) {
        // Refresh token failed -> clear tokens and redirect to login
        localStorage.removeItem('sm_access_token');
        localStorage.removeItem('sm_refresh_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

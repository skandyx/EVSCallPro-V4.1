import axios from 'axios';

const isServer = typeof window === 'undefined';
const getToken = () => !isServer ? localStorage.getItem('authToken') : null;

// Instance pour les routes publiques (login, config), SANS intercepteurs
export const publicApiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});


// Instance pour les routes protégées, AVEC intercepteurs de token
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ------- REQUEST INTERCEPTOR ------- */
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ------- RESPONSE INTERCEPTOR ------- */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshRequest = originalRequest.url.endsWith('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        const { data } = await publicApiClient.post('/auth/refresh'); 
        
        if (!isServer) {
          localStorage.setItem('authToken', data.accessToken);
        }
        
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        
        return apiClient(originalRequest);

      } catch (refreshError) {
        if (!isServer) {
          localStorage.removeItem('authToken');
          window.dispatchEvent(new CustomEvent('logoutEvent'));
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
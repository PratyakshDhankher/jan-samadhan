import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

// Attach token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('js_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// If token is expired (401), clear it and redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('js_token');
            localStorage.removeItem('js_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
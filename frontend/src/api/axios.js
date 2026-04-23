import axios from 'axios';

// Create a custom instance of axios
const api = axios.create({
    // Pulls from .env or defaults to 8000
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

// Add a request interceptor to attach the JWT token automatically
api.interceptors.request.use(
    (config) => {
        // Retrieve the token from localStorage (matching your AuthContext)
        const token = localStorage.getItem('js_token');
        
        // If a token exists, attach it to the Authorization header
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;